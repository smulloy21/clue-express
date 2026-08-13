-- Up Migration

-- Schema required by connect-pg-simple: https://github.com/voxpelli/node-connect-pg-simple#table-schema
CREATE TABLE session (
  sid    varchar NOT NULL,
  sess   json NOT NULL,
  expire timestamp(6) NOT NULL
);

ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX idx_session_expire ON session (expire);

-- Down Migration

DROP TABLE session;
