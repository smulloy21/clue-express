-- Up Migration

CREATE TABLE game_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id),
  participants jsonb not null,
  winner_seat  int,
  human_won    boolean not null,
  finished_at  timestamptz not null default now()
);

CREATE INDEX game_records_user_id_idx ON game_records (user_id);

-- Down Migration

DROP TABLE game_records;
