-- Reset migration state (for debugging/development only)
-- This drops the schema_migrations table so golang-migrate can recreate it

DROP TABLE IF EXISTS schema_migrations;

-- Optional: Also reset the database schema (uncomment if needed)
-- DROP TABLE IF EXISTS widget_configs;
-- DROP TABLE IF EXISTS widget_settings;
-- DROP TABLE IF EXISTS services;
-- DROP TABLE IF EXISTS credentials;
-- DROP TABLE IF EXISTS users;