---
name: db:push data-loss trap
description: Why `npm run db:push` is dangerous in this repo and how to apply schema/index changes safely.
---

# db:push drops raw-SQL tables and columns

Several production tables and columns exist in the database but are NOT defined in the Drizzle schema (`shared/*-schema.ts`). They are created/maintained via raw SQL at runtime. Notably:

- `aria_*` tables (aria_business, aria_leads, aria_actions, aria_snapshots, and other aria_* tables)
- `from_email_token` column in `track_sessions` (email-to-website identity bridge)

**The rule:** Never run `npm run db:push` non-interactively or with a force flag. Because those tables/columns are absent from the Drizzle schema, drizzle-kit interprets them as "to be deleted" and proposes a destructive migration (observed: drop 4 aria_ tables with 89 leads / 217 actions, drop from_email_token with 103 rows). The non-interactive run defaults to "No, abort" — keep it that way.

**Why:** This project intentionally keeps aria_* as raw-SQL tables (see replit.md). A blind push would wipe production data for Abel Nkawula's tenant.

**How to apply changes:**
- For new indexes from a Drizzle schema refactor: read the `index(...)` definitions, map Drizzle columns to their snake_case DB names, and run `CREATE INDEX IF NOT EXISTS ...` manually (idempotent, additive, no data loss).
- For genuine new columns/tables: add them additively via raw SQL (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`), never via db:push.
- Existing tables must only get additive changes — never drop/alter existing columns.
