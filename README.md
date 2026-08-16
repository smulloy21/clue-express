# Clue Express

A single-player, boardless deduction game based on classic Clue/Cluedo, played in the browser
against two AI bots. Node/Express + TypeScript backend, React frontend, PostgreSQL for accounts
and game records, MongoDB for live game state.

See [SPEC.md](./SPEC.md) for the full design spec.

## Architecture

npm workspaces monorepo:

```
packages/
  engine/   pure TypeScript game engine + bot AI — zero I/O dependencies, fully unit-tested
  server/   Express app: auth, game routes, Postgres/Mongo adapters
  client/   React (Vite) single-page app
```

- **Engine**: a pure, transport-agnostic state machine (deal → guess → disproval →
  accuse/pass → end conditions) plus easy/hard bot AI, built around a shared card × holder
  knowledge base. No I/O — fully deterministic given a seed, so it's driven by scripted unit
  tests and a bot-vs-bot simulation harness.
- **Server**: plain REST (no WebSockets). Bot turns resolve synchronously server-side; every
  action response includes the ordered events since the client's last known state, which the
  client replays with a short delay per event for pacing. Every response is built through
  `redactStateForPlayer` — the solution and other players' hands never reach the client.
- **Client**: zustand for state (no Redux, no router — the game is a small linear screen
  flow), plain CSS, no component library.
- **Data**: MongoDB holds live game documents (including each bot's persisted knowledge, so a
  server restart mid-game doesn't lose their reasoning); PostgreSQL holds user accounts,
  sessions, and finished-game records.

## Prerequisites

- Node.js 20+
- Docker (for local Postgres + MongoDB)

## Setup

```bash
npm install
cp .env.example .env        # edit if you need different ports/credentials
npm run dev:db               # starts Postgres + MongoDB via docker-compose
npm run migrate --workspace=@clue/server up
```

`npm run dev` (see below) and `npm run migrate` automatically pick up `.env` from the repo
root if present — no need to `export` anything by hand.

## Running it

```bash
npm run dev
```

This starts the API server (`http://localhost:3000`) and the client dev server
(`http://localhost:5173`, proxying `/api` to the server) together. Open
`http://localhost:5173` and play.

To run them separately: `npm run dev --workspace=@clue/server` /
`npm run dev --workspace=@clue/client`.

## Testing

```bash
npm test                     # every package's test suite
npm test --workspace=@clue/engine   # just one package
```

- **engine**: unit tests for dealing, the full turn state machine, redaction, and scripted
  easy/hard bot inference.
- **server**: integration tests (supertest) for auth flows and full games played through the
  HTTP API against in-memory fakes, including an explicit assertion that no in-progress
  response ever contains the solution or another player's hand.
- **client**: the API client, both zustand stores (including the timer-driven event-reveal
  pacing), the detective notepad's inference, and React Testing Library coverage of the
  trickier interactive pieces (the two-step accusation confirmation, the disproval modal).

### Bot-vs-bot simulation harness

```bash
npm run simulate --workspace=@clue/engine -- --games 500 --p1 hard --p2 easy
```

Plays N headless games and reports win rates by difficulty and average game length — used to
validate that the hard bot reliably beats the easy bot (empirically ~99–100% over hundreds of
games; see `packages/engine/src/simulate/simulate.test.ts`).

## Other useful scripts

Run from the repo root (each fans out to every workspace):

- `npm run build` — typecheck + build every package
- `npm run typecheck` — typecheck only
- `npm run lint` / `npm run format` / `npm run format:check`
- `npm run migrate --workspace=@clue/server -- <up|down|create> [name]` — Postgres migrations
  (see `packages/server/migrations/`)

## Environment variables

See [.env.example](./.env.example):

| Variable         | Used by | Purpose                                                    |
| ---------------- | ------- | ---------------------------------------------------------- |
| `DATABASE_URL`   | server  | Postgres connection string                                 |
| `MONGO_URL`      | server  | MongoDB connection string                                  |
| `SESSION_SECRET` | server  | signs the session cookie — set a real secret in production |
| `PORT`           | server  | API server port (default 3000)                             |

In production, set `NODE_ENV=production` — this enables `secure` session cookies and trusts
the first reverse-proxy hop (`trust proxy`).

## Notes

- No resume feature in v1: starting a new game marks any of your prior in-progress games as
  abandoned. Persisting live state in Mongo anyway makes resume a trivial v2 addition.
- Multiplayer isn't built, but the architecture (pure engine, event-sourced state, redaction
  layer, plain REST) is designed so Socket.IO could be layered on without a rewrite.
- "Clue"/"Cluedo" and the classic character/weapon/room names are Hasbro trademarks. This is a
  personal project; all card names live in one data-driven module
  (`packages/engine/src/constants.ts`) so they can be swapped out if this were ever made public.
