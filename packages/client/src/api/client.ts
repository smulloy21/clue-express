import type {
  Accusation,
  BotDifficulty,
  CardName,
  Guess,
  RedactedGameEvent,
  RedactedGameState,
} from "@clue/engine";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    const errorCode =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : undefined;
    super(errorCode ?? `request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : null,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data: unknown = await res.json().catch(() => undefined);
  if (!res.ok) {
    throw new ApiError(res.status, data);
  }
  return data as T;
}

// --- Auth ---

export interface MeResponse {
  authenticated: boolean;
  guest?: boolean;
  id?: string;
  username?: string;
}

export interface AuthUserResponse {
  id: string;
  username: string;
}

export function signup(username: string, password: string): Promise<AuthUserResponse> {
  return request("POST", "/auth/signup", { username, password });
}

export function login(username: string, password: string): Promise<AuthUserResponse> {
  return request("POST", "/auth/login", { username, password });
}

export function playAsGuest(): Promise<{ guest: true }> {
  return request("POST", "/auth/guest");
}

export function logout(): Promise<void> {
  return request("POST", "/auth/logout");
}

export function getMe(): Promise<MeResponse> {
  return request("GET", "/auth/me");
}

// --- Games ---

export interface CreateGameResponse {
  gameId: string;
  state: RedactedGameState;
}

export function createGame(
  botDifficulties: [BotDifficulty, BotDifficulty],
  daily?: boolean,
): Promise<CreateGameResponse> {
  return request("POST", "/games", { botDifficulties, ...(daily ? { daily: true } : {}) });
}

export interface GameStateResponse {
  redactedState: RedactedGameState;
  events: RedactedGameEvent[];
}

export function getGameState(gameId: string, since?: number): Promise<GameStateResponse> {
  const query = since !== undefined ? `?since=${since}` : "";
  return request("GET", `/games/${gameId}/state${query}`);
}

export interface ActionResponse {
  state: RedactedGameState;
}

export function submitGuess(gameId: string, guess: Guess): Promise<ActionResponse> {
  return request("POST", `/games/${gameId}/guess`, guess);
}

export function submitDisprove(gameId: string, card: CardName): Promise<ActionResponse> {
  return request("POST", `/games/${gameId}/disprove`, { card });
}

export function submitPass(gameId: string): Promise<ActionResponse> {
  return request("POST", `/games/${gameId}/pass`);
}

export function submitAccusation(gameId: string, accusation: Accusation): Promise<ActionResponse> {
  return request("POST", `/games/${gameId}/accuse`, accusation);
}

// --- Records ---

export interface GameRecordParticipantDto {
  seat: number;
  type: "human" | "bot";
  difficulty?: BotDifficulty;
}

export interface GameRecordDto {
  id: string;
  userId: string | null;
  participants: GameRecordParticipantDto[];
  winnerSeat: number | null;
  humanWon: boolean;
  finishedAt: string;
}

export function getRecords(): Promise<{ records: GameRecordDto[] }> {
  return request("GET", "/records");
}
