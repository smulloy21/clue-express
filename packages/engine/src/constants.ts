export const SUSPECTS = [
  "Miss Scarlet",
  "Colonel Mustard",
  "Mrs. White",
  "Mr. Green",
  "Mrs. Peacock",
  "Professor Plum",
] as const;

export const WEAPONS = ["Candlestick", "Knife", "Lead Pipe", "Revolver", "Rope", "Wrench"] as const;

export const ROOMS = [
  "Kitchen",
  "Ballroom",
  "Conservatory",
  "Dining Room",
  "Billiard Room",
  "Library",
  "Lounge",
  "Hall",
  "Study",
] as const;

export type Suspect = (typeof SUSPECTS)[number];
export type Weapon = (typeof WEAPONS)[number];
export type Room = (typeof ROOMS)[number];

export type Category = "suspect" | "weapon" | "room";
export type CardName = Suspect | Weapon | Room;

export interface Card {
  category: Category;
  name: CardName;
}

export const CATEGORIES: readonly Category[] = ["suspect", "weapon", "room"];

export const ALL_CARDS: readonly Card[] = [
  ...SUSPECTS.map((name): Card => ({ category: "suspect", name })),
  ...WEAPONS.map((name): Card => ({ category: "weapon", name })),
  ...ROOMS.map((name): Card => ({ category: "room", name })),
];

const SUSPECT_SET: ReadonlySet<string> = new Set(SUSPECTS);
const WEAPON_SET: ReadonlySet<string> = new Set(WEAPONS);
const ROOM_SET: ReadonlySet<string> = new Set(ROOMS);

export function isSuspect(name: string): name is Suspect {
  return SUSPECT_SET.has(name);
}

export function isWeapon(name: string): name is Weapon {
  return WEAPON_SET.has(name);
}

export function isRoom(name: string): name is Room {
  return ROOM_SET.has(name);
}
