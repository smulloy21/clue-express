export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: Date;
}

/** The subset of `pg.Pool`'s query API the repository needs — kept narrow for testability. */
export interface Queryable {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

/** Thrown when inserting a username that already exists (mirrors Postgres's unique_violation, 23505). */
export class DuplicateUsernameError extends Error {
  constructor(username: string) {
    super(`username "${username}" is already taken`);
  }
}

export interface UserRepository {
  findByUsername(username: string): Promise<UserRecord | null>;
  create(username: string, passwordHash: string): Promise<UserRecord>;
}

function mapRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

const UNIQUE_VIOLATION = "23505";

export function createUserRepository(db: Queryable): UserRepository {
  return {
    async findByUsername(username) {
      const { rows } = await db.query<UserRow>(
        "SELECT id, username, password_hash, created_at FROM users WHERE username = $1",
        [username],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },

    async create(username, passwordHash) {
      try {
        const { rows } = await db.query<UserRow>(
          "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, password_hash, created_at",
          [username, passwordHash],
        );
        return mapRow(rows[0]!);
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === UNIQUE_VIOLATION
        ) {
          throw new DuplicateUsernameError(username);
        }
        throw error;
      }
    },
  };
}
