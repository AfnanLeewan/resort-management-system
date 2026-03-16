-- =====================================================
-- Roles required by PostgREST
-- Run before schema.sql
-- =====================================================

-- Roles for PostgREST role-switching
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;

-- Allow postgres user to switch into these roles (required by PostgREST)
GRANT anon TO postgres;
GRANT authenticated TO postgres;
GRANT service_role TO postgres;
