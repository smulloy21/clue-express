# Boardless Clue — Project Specification (v1)

A single-player, boardless deduction game based on classic Clue/Cluedo, played in the browser against two AI bots. Node/Express + TypeScript backend, React frontend, PostgreSQL for accounts and game records, MongoDB for live game state.

> **Note for the coding agent:** Build milestone by milestone (see §9). The game engine must be a pure, transport-agnostic TypeScript module so multiplayer can be added later without a rewrite. Never send the solution or bot hands to the client.

---

## 1. Game Rules

### Setup
- Exactly **3 players**: 1 human + 2 bots (each bot independently configured as `easy` or `hard`).
- Classic 21 cards:
  - **Suspects (6):** Miss Scarlet, Colonel Mustard, Mrs. White, Mr. Green, Mrs. Peacock, Professor Plum
  - **Weapons (6):** Candlestick, Knife, Lead Pipe, Revolver, Rope, Wrench
  - **Rooms (9):** Kitchen, Ballroom, Conservatory, Dining Room, Billiard Room, Library, Lounge, Hall, Study
- One card of each category is secretly set aside as the **solution**. The remaining 18 cards are shuffled and dealt evenly, 6 per player.
- Turn order is randomized at game start and fixed thereafter.

### Turn structure (no board, no dice, no movement)
On a player's turn:
1. **Guess (suggestion):** the player names one suspect, one weapon, one room. Any combination is allowed (including cards in their own hand — a legal bluffing tactic).
2. **Disproval:** proceeding clockwise from the guesser, each other player in turn checks their hand:
   - If they hold **one or more** of the three named cards, they must privately show **exactly one** matching card (their choice, if they hold multiple) to the guesser. Disproval then stops.
   - If they hold none, they publicly pass, and the next player is checked.
   - All players observe **who** disproved (or that nobody could), but only the guesser sees **which** card was shown.
3. **Accuse or pass:** after the disproval step, the same player may either end their turn (pass) or make a **final accusation** (suspect + weapon + room, checked against the solution).
   - **Correct accusation:** that player wins immediately; game over.
   - **Incorrect accusation:** that player is eliminated from winning but **remains in the game to disprove** other players' guesses. They take no further turns.

### End conditions
- Any player makes a correct accusation → game over, that player wins.
- The **human** makes an incorrect accusation → game over immediately, human loses, solution revealed. (It is not necessary to let the bots play on to determine a winner.)
- All three players have made incorrect accusations → game over, no winner, solution revealed.

### Human-specific interactions
- When a bot's guess reaches the human and the human holds ≥1 matching card, the UI must prompt the human to **choose which card to show** (auto-select only if they hold exactly one match).
- The human sees a running event log: every guess, who disproved whom (card hidden unless shown *to* the human), who passed, and all accusations.

---

## 2. Bot AI

Both difficulties share a **knowledge base** structure; they differ in what they record and how they infer.

### Knowledge representation (per bot)
A matrix of `card × holder` with values `YES / NO / UNKNOWN`, where holders are: each of the 3 players and the solution envelope. Constraints:
- Each card has exactly one holder.
- Each player holds exactly 6 cards.
- The envelope holds exactly one card per category.

### Easy bot
- **Records:** its own hand, and cards physically shown to it during disprovals.
- **Guessing:** picks uniformly at random per category from cards it hasn't confirmed a holder for. May include its own cards occasionally (small configurable bluff probability, default 10%).
- **Accusing:** only when its knowledge leaves exactly one possible card per category for the envelope. Otherwise it always passes.

### Hard bot
Everything the easy bot does, plus **negative and structural inference from public events**:
- When any player **fails to disprove** a guess, mark all three guessed cards as `NO` for that player.
- When player X disproves player Y's guess (card unseen by this bot), record the disjunction "X holds at least one of {a, b, c}." Re-evaluate stored disjunctions whenever new facts arrive: if two of the three are later proven `NO` for X, the third becomes `YES` for X.
- Standard constraint propagation: a card `YES` for one holder is `NO` for all others; a player with 6 confirmed cards gets `NO` on everything else; a card marked `NO` for all players belongs to the envelope; if all-but-one card in a category is disproven for the envelope, the remaining card is the solution's for that category.
- **Guessing strategy:** prefer guesses that maximize expected information (e.g., include cards whose holder is unknown; optionally include one own-hand card to probe a single unknown). A simple heuristic is fine for v1 — do not over-engineer.
- **Accusing:** as soon as the envelope's three cards are fully determined.

### Engineering requirements
- Bot logic must be **deterministic given a seeded RNG** so unit tests are reproducible.
- Include a **bot-vs-bot simulation harness** (script) that runs N headless games and reports win rates and average game length — used to validate that hard reliably beats easy.

---

## 3. Architecture

```
/ (repo root — npm workspaces monorepo)
├── packages/
│   ├── engine/     # pure TS game engine + bot AI, zero I/O deps, fully unit-tested
│   ├── server/     # Express app: auth, game routes, Mongo/Postgres adapters
│   └── client/     # React (Vite) SPA
├── docker-compose.yml   # postgres + mongo for local dev
└── SPEC.md
```

- **Language:** TypeScript everywhere (strict mode).
- **Transport (v1): plain REST.** No WebSockets yet. Bot turns are resolved synchronously server-side; the API returns the ordered list of events since the client's last known event index, and the client animates them with artificial delays for pacing. The engine and routes must not assume request/response semantics internally — all game progress flows through an event list — so Socket.IO can be layered on for multiplayer later.
- **Hidden information is enforced server-side.** Every state payload sent to the client is produced by a `redactStateForPlayer(state, playerId)` function. The solution and bot hands never leave the server. Treat this as a hard security requirement with tests.

---

## 4. Data Layer

### PostgreSQL — identity & records
```sql
users (
  id            uuid primary key default gen_random_uuid(),
  username      text unique not null,
  password_hash text not null,          -- argon2id (or bcrypt if argon2 unavailable)
  created_at    timestamptz not null default now()
);

game_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id),   -- null for guest games
  participants jsonb not null,              -- e.g. [{"seat":0,"type":"human"},{"seat":1,"type":"bot","difficulty":"hard"}, ...]
  winner_seat  int,                          -- null = no winner
  human_won    boolean not null,
  finished_at  timestamptz not null default now()
);
```
A record is written **only when a game finishes**. Use a migration tool (e.g., node-pg-migrate or drizzle-kit).

### MongoDB — live game state
One document per active game in a `games` collection:
```jsonc
{
  "_id": "<gameId>",
  "userId": "<uuid or null for guest>",
  "status": "in_progress | finished",
  "seed": 12345,
  "solution": { "suspect": "...", "weapon": "...", "room": "..." },
  "players": [
    { "seat": 0, "type": "human", "hand": [...], "eliminated": false },
    { "seat": 1, "type": "bot", "difficulty": "hard", "hand": [...], "eliminated": false, "knowledge": { ... } }
  ],
  "turn": { "currentSeat": 0, "phase": "guess | awaiting_human_disproval | accuse_or_pass" },
  "events": [ { "index": 0, "type": "guess", ... }, ... ],
  "createdAt": "...", "updatedAt": "..."
}
```
- The **event list is the source of truth for the client**; bot `knowledge` is persisted so a server restart mid-request doesn't corrupt bot reasoning.
- No resume feature in v1: on login/landing, any `in_progress` game for that user is simply marked `abandoned` and a fresh game starts. (Persisting state in Mongo anyway makes resume a trivial v2 feature.)
- TTL or cleanup job for abandoned games is nice-to-have, not required.

---

## 5. Auth & Sessions

- **Signup/login** with username + password. Hash with **argon2id** (fallback: bcrypt, cost ≥ 12). Never log or return password material.
- **Sessions:** `express-session` with `connect-pg-simple` (session table lives in Postgres). HttpOnly, SameSite=Lax cookies; `secure` in production.
- **Guest mode (required — it's cheap):** a "Play as guest" button creates a session with `{ guest: true }` and no `users` row. Guests can play full games; their `game_records.user_id` is null. The UI offers signup at game end ("create an account to save your record") — linking past guest games to the new account is **out of scope** for v1.
- Basic input validation (zod) and rate limiting on auth endpoints.

---

## 6. API (REST, JSON)

```
POST /api/auth/signup            {username, password}
POST /api/auth/login             {username, password}
POST /api/auth/guest             -> creates guest session
POST /api/auth/logout
GET  /api/auth/me                -> {user | guest}

POST /api/games                  {botDifficulties: ["easy"|"hard", "easy"|"hard"]} -> {gameId, state}
GET  /api/games/:id/state?since=<eventIndex>   -> {redactedState, events[]}
POST /api/games/:id/guess        {suspect, weapon, room}
POST /api/games/:id/disprove     {card}          // human choosing which card to show a bot
POST /api/games/:id/pass
POST /api/games/:id/accuse       {suspect, weapon, room}

GET  /api/records                -> logged-in user's finished games
```
Server resolves all bot turns after any human action and appends their events atomically before responding. All game routes verify the session owns the game.

---

## 7. Frontend (React + Vite + TS)

Screens:
1. **Landing/Auth** — login, signup, play-as-guest.
2. **New game** — pick each bot's difficulty; start.
3. **Game table** — the main screen:
   - Your hand (6 cards, grouped by category).
   - Guess builder (three dropdowns/pickers + Guess button).
   - After disproval resolves: **Accuse** / **Pass** choice (Accuse opens a confirm dialog warning it's final).
   - Disproval prompt modal when the human must show a card to a bot.
   - Scrolling **event log** with the public view of all events.
   - A **detective notepad**: an auto-maintained grid (cards × players) that fills in what the human provably knows (own hand, cards shown to them, public "could not disprove" events). Manual pencil-marks are a nice-to-have.
4. **Game over** — result, revealed solution, "Play again"; signup prompt for guests.
5. **Record** (logged-in users) — simple list of past results.

Keep styling simple and clean; no component library required. Client state via React context or a small store (zustand); no Redux.

---

## 8. Testing

- **engine:** high unit-test coverage — dealing, disproval order, accusation/elimination rules, end conditions, redaction, easy/hard bot inference (feed scripted event sequences and assert deductions), seeded determinism.
- **server:** integration tests for auth flows and a full game played via the API (supertest), including an assertion that no response ever contains the solution or a bot's hand.
- **simulation harness:** `npm run simulate -- --games 500 --p1 hard --p2 easy` style script in `engine`.

---

## 9. Build Milestones (do these in order)

1. **Scaffold:** monorepo with workspaces, strict TS configs, ESLint/Prettier, docker-compose (postgres + mongo), CI-ready test script.
2. **Engine core:** types, deck/deal, turn state machine, guess→disproval→accuse/pass flow, eliminations, end conditions, event log, `redactStateForPlayer`. Unit tests throughout.
3. **Bots:** knowledge base + easy bot, then hard bot inference; simulation harness proving hard > easy.
4. **Persistence:** Mongo game repository (load/apply-action/save), Postgres migrations for users/game_records/sessions.
5. **Auth:** signup/login/guest/logout/me with sessions.
6. **Game API:** routes in §6 wired to engine + repos; integration tests; write `game_records` on finish.
7. **Client:** screens in §7 against the real API.
8. **Polish:** input validation everywhere, error states, seeded "daily game" optional, README with setup instructions.

---

## 10. Explicitly Out of Scope (v1)

- Multiplayer (architecture must allow it; do not build it).
- Resuming abandoned games.
- Detailed move history in Postgres (only winner/participants/timestamp).
- Linking guest games to a later account.
- Board, dice, movement, or room-based guess restrictions — this variant has none.

## 11. Notes

- "Clue"/"Cluedo" and the classic names are Hasbro trademarks. Fine for a personal project; make card names data-driven (a single constants module) so they can be swapped if this ever goes public.
