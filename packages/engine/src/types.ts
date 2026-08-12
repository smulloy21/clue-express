import type { CardName, Room, Suspect, Weapon } from "./constants.js";

export interface Guess {
  suspect: Suspect;
  weapon: Weapon;
  room: Room;
}

export type Accusation = Guess;

export interface Solution {
  suspect: Suspect;
  weapon: Weapon;
  room: Room;
}

export type PlayerType = "human" | "bot";
export type BotDifficulty = "easy" | "hard";

export interface PlayerConfig {
  type: PlayerType;
  difficulty?: BotDifficulty;
}

export interface PlayerState extends PlayerConfig {
  seat: number;
  hand: CardName[];
  eliminated: boolean;
}

export type TurnPhase = "guess" | "awaiting_disproval" | "accuse_or_pass";

export interface PendingDisproval {
  guesserSeat: number;
  disproverSeat: number;
  options: CardName[];
}

export interface TurnState {
  currentSeat: number;
  phase: TurnPhase;
  pending?: PendingDisproval;
}

export type GameOverReason = "correct_accusation" | "human_incorrect_accusation" | "all_eliminated";

export type GameEvent =
  | { index: number; type: "guess"; seat: number; guess: Guess }
  | { index: number; type: "no_disproval"; seat: number }
  | {
      index: number;
      type: "disprove";
      guesserSeat: number;
      disproverSeat: number;
      card: CardName;
    }
  | { index: number; type: "pass"; seat: number }
  | {
      index: number;
      type: "accusation";
      seat: number;
      accusation: Accusation;
      correct: boolean;
    }
  | {
      index: number;
      type: "game_over";
      winnerSeat: number | null;
      reason: GameOverReason;
      solution: Solution;
    };

export type GameStatus = "in_progress" | "finished";

export interface GameState {
  seed: number;
  status: GameStatus;
  solution: Solution;
  players: PlayerState[];
  turn: TurnState;
  winnerSeat: number | null;
  events: GameEvent[];
}

export class IllegalActionError extends Error {}
