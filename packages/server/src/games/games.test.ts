import { ROOMS, SUSPECTS, WEAPONS, type RedactedGameState } from "@clue/engine";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp } from "../testSupport/fakeApp.js";

const arbitraryGuess = { suspect: SUSPECTS[0], weapon: WEAPONS[0], room: ROOMS[0] };

interface ActionResponseBody {
  state: RedactedGameState;
}

async function playUntilFinished(
  agent: ReturnType<typeof request.agent>,
  gameId: string,
  initialState: RedactedGameState,
) {
  const bodies: ActionResponseBody[] = [];
  let state = initialState;
  for (let i = 0; i < 300 && state.status !== "finished"; i++) {
    if (state.turn.phase === "guess" && state.turn.currentSeat === state.viewerSeat) {
      const res = await agent.post(`/api/games/${gameId}/guess`).send(arbitraryGuess);
      bodies.push(res.body);
      state = res.body.state;
    } else if (
      state.turn.phase === "awaiting_disproval" &&
      state.turn.pending?.disproverSeat === state.viewerSeat
    ) {
      const res = await agent
        .post(`/api/games/${gameId}/disprove`)
        .send({ card: state.turn.pending!.options![0]! });
      bodies.push(res.body);
      state = res.body.state;
    } else if (
      state.turn.phase === "accuse_or_pass" &&
      state.turn.currentSeat === state.viewerSeat
    ) {
      const res = await agent.post(`/api/games/${gameId}/pass`);
      bodies.push(res.body);
      state = res.body.state;
    } else {
      throw new Error(
        `server did not resolve bot turns before responding: ${JSON.stringify(state.turn)}`,
      );
    }
  }
  if (state.status !== "finished") {
    throw new Error("game did not finish within the test's iteration budget");
  }
  return { bodies, finalState: state };
}

describe("POST /api/games", () => {
  it("requires authentication", async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .post("/api/games")
      .send({ botDifficulties: ["easy", "easy"] });
    expect(res.status).toBe(401);
  });

  it("lets a guest create a game", async () => {
    const { app } = createTestApp();
    const agent = request.agent(app);
    await agent.post("/api/auth/guest");

    const res = await agent.post("/api/games").send({ botDifficulties: ["easy", "hard"] });

    expect(res.status).toBe(201);
    expect(res.body.gameId).toBeTypeOf("string");
    expect(res.body.state.players).toHaveLength(3);
    const own = res.body.state.players.find(
      (p: { seat: number }) => p.seat === res.body.state.viewerSeat,
    );
    expect(own.hand).toHaveLength(6);
  });

  it("gives two different sessions the identical deal when both play the daily challenge", async () => {
    const { app, gameRepository } = createTestApp();

    const agentA = request.agent(app);
    await agentA.post("/api/auth/guest");
    const gameA = await agentA
      .post("/api/games")
      .send({ botDifficulties: ["easy", "hard"], daily: true });

    const agentB = request.agent(app);
    await agentB.post("/api/auth/guest");
    const gameB = await agentB
      .post("/api/games")
      .send({ botDifficulties: ["easy", "hard"], daily: true });

    const docA = await gameRepository.load(gameA.body.gameId);
    const docB = await gameRepository.load(gameB.body.gameId);

    expect(docA?.seed).toBe(docB?.seed);
    expect(docA?.solution).toEqual(docB?.solution);
    expect(docA?.players.map((p) => p.hand)).toEqual(docB?.players.map((p) => p.hand));
  });

  it("gives two non-daily games different seeds", async () => {
    const { app, gameRepository } = createTestApp();
    const agent = request.agent(app);
    await agent.post("/api/auth/guest");

    const gameA = await agent.post("/api/games").send({ botDifficulties: ["easy", "hard"] });
    const gameB = await agent.post("/api/games").send({ botDifficulties: ["easy", "hard"] });

    const docA = await gameRepository.load(gameA.body.gameId);
    const docB = await gameRepository.load(gameB.body.gameId);

    expect(docA?.seed).not.toBe(docB?.seed);
  });

  it("rejects malformed botDifficulties", async () => {
    const { app } = createTestApp();
    const agent = request.agent(app);
    await agent.post("/api/auth/guest");

    const res = await agent.post("/api/games").send({ botDifficulties: ["medium", "easy"] });
    expect(res.status).toBe(400);
  });

  it("abandons a prior in-progress game for the same session when a new one is created", async () => {
    const { app, gameRepository } = createTestApp();
    const agent = request.agent(app);
    await agent.post("/api/auth/guest");

    const first = await agent.post("/api/games").send({ botDifficulties: ["easy", "easy"] });
    await agent.post("/api/games").send({ botDifficulties: ["easy", "easy"] });

    const firstDoc = await gameRepository.load(first.body.gameId);
    expect(firstDoc?.status).toBe("abandoned");
  });
});

describe("GET /api/games/:id/state", () => {
  it("returns 404 for a game that doesn't belong to this session", async () => {
    const { app } = createTestApp();
    const ownerAgent = request.agent(app);
    await ownerAgent.post("/api/auth/guest");
    const created = await ownerAgent.post("/api/games").send({ botDifficulties: ["easy", "easy"] });

    const otherAgent = request.agent(app);
    await otherAgent.post("/api/auth/guest");
    const res = await otherAgent.get(`/api/games/${created.body.gameId}/state`);

    expect(res.status).toBe(404);
  });

  it("returns 404 for an unknown game id", async () => {
    const { app } = createTestApp();
    const agent = request.agent(app);
    await agent.post("/api/auth/guest");

    const res = await agent.get("/api/games/does-not-exist/state");
    expect(res.status).toBe(404);
  });

  it("only returns events after the given index", async () => {
    const { app } = createTestApp();
    const agent = request.agent(app);
    await agent.post("/api/auth/guest");
    const created = await agent.post("/api/games").send({ botDifficulties: ["easy", "easy"] });
    const gameId = created.body.gameId as string;

    const all = await agent.get(`/api/games/${gameId}/state`);
    const totalEvents = all.body.events.length;

    const sinceZero = await agent.get(`/api/games/${gameId}/state?since=0`);
    expect(sinceZero.body.events).toEqual(
      all.body.events.filter((e: { index: number }) => e.index > 0),
    );

    const sinceAll = await agent.get(`/api/games/${gameId}/state?since=${totalEvents - 1}`);
    expect(sinceAll.body.events.length).toBeLessThanOrEqual(1);
  });

  it("rejects a non-numeric since parameter", async () => {
    const { app } = createTestApp();
    const agent = request.agent(app);
    await agent.post("/api/auth/guest");
    const created = await agent.post("/api/games").send({ botDifficulties: ["easy", "easy"] });

    const res = await agent.get(`/api/games/${created.body.gameId}/state?since=not-a-number`);
    expect(res.status).toBe(400);
  });

  it("rejects a negative since parameter below -1", async () => {
    const { app } = createTestApp();
    const agent = request.agent(app);
    await agent.post("/api/auth/guest");
    const created = await agent.post("/api/games").send({ botDifficulties: ["easy", "easy"] });

    const res = await agent.get(`/api/games/${created.body.gameId}/state?since=-5`);
    expect(res.status).toBe(400);
  });
});

describe("game action routes reject the wrong phase", () => {
  it("rejects an action for a phase that isn't currently active", async () => {
    const { app } = createTestApp();
    const agent = request.agent(app);
    await agent.post("/api/auth/guest");
    const created = await agent.post("/api/games").send({ botDifficulties: ["easy", "easy"] });

    const { phase } = created.body.state.turn;
    const wrongRoute = phase === "guess" ? "pass" : "guess";
    const res = await agent
      .post(`/api/games/${created.body.gameId}/${wrongRoute}`)
      .send(arbitraryGuess);

    expect(res.status).toBe(409);
  });

  it("rejects a guess with an invalid card name", async () => {
    const { app } = createTestApp();
    const agent = request.agent(app);
    await agent.post("/api/auth/guest");
    const created = await agent.post("/api/games").send({ botDifficulties: ["easy", "easy"] });
    if (created.body.state.turn.phase !== "guess") return;

    const res = await agent
      .post(`/api/games/${created.body.gameId}/guess`)
      .send({ suspect: "Not A Suspect", weapon: WEAPONS[0], room: ROOMS[0] });

    expect(res.status).toBe(400);
  });
});

describe("a full game played via the API", () => {
  it("never leaks the solution or another player's hand, and writes a game_record on finish", async () => {
    const { app, gameRepository, gameRecordRepository } = createTestApp();
    const agent = request.agent(app);
    await agent
      .post("/api/auth/signup")
      .send({ username: "player_one", password: "correct-horse-battery" });

    const created = await agent.post("/api/games").send({ botDifficulties: ["hard", "hard"] });
    expect(created.status).toBe(201);
    const gameId = created.body.gameId as string;

    const trueDoc = await gameRepository.load(gameId);

    const { bodies, finalState } = await playUntilFinished(agent, gameId, created.body.state);

    // Card *names* are not secret — they're named constantly in guesses and shown disprovals.
    // What must never leak while in_progress is the `solution` field itself and other players' hands.
    const inProgressBodies = [created.body, ...bodies.slice(0, -1)];
    for (const body of inProgressBodies) {
      expect(JSON.stringify(body)).not.toContain('"solution"');
      const state = (body as { state: typeof finalState }).state;
      for (const player of state.players) {
        if (player.seat !== state.viewerSeat) {
          expect(player.hand).toBeUndefined();
        }
      }
    }

    expect(finalState.status).toBe("finished");
    expect(finalState.solution).toBeDefined();

    const finishedDoc = await gameRepository.load(gameId);
    expect(finishedDoc?.status).toBe("finished");

    const records = await gameRecordRepository.findByUserId(trueDoc!.userId!);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      winnerSeat: finalState.winnerSeat,
      humanWon:
        finalState.winnerSeat !== null &&
        finalState.players.find((p: { seat: number }) => p.seat === finalState.winnerSeat)?.type ===
          "human",
    });
    expect(records[0]!.participants).toHaveLength(3);
  }, 20000);
});
