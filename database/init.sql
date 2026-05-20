-- MedStore PostgreSQL Init Script
-- Run automatically by Docker on first start

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search

-- Create indexes for common searches (additional to Prisma's)
-- These will be created after Prisma migrations
