-- Optional initialization script for local Docker Compose Postgres.
-- Kept intentionally minimal.

-- Enable commonly-used extension(s)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
