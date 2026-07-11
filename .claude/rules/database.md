# Database Rules

## Drizzle ORM (Standard Tables)
- All schema definitions live in `shared/schema.ts` — never define tables elsewhere
- Run `npm run db:push` after schema changes, never write raw migration SQL for Drizzle tables
- Use `drizzle-zod` to derive Zod schemas from Drizzle tables to avoid duplication
- Import `db` from `server/db.ts` — do not create new database connections

## Aria Raw SQL Tables
- The 10 `aria_*` tables are managed via raw SQL in `server/aria-memory.ts`
- Do NOT add these to `shared/schema.ts` or run Drizzle migrations on them
- Always use parameterized queries — never string-interpolate user input into SQL

## General
- Wrap multi-step DB operations in transactions when partial failure would corrupt state
- Use `.returning()` in Drizzle inserts/updates when you need the resulting row
