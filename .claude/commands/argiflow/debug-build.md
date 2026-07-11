# Debug Build

Step-by-step debugging checklist for ArgiFlow build and type errors.

## Run in order

```bash
# 1. TypeScript errors
npm run check

# 2. Build output
npm run build 2>&1 | head -80

# 3. Check for circular imports (common in ESM)
# Look for "The requested module ... does not provide an export"

# 4. Drizzle schema sync
npm run db:push
```

## Common Issues

**"Cannot find module" in server**
- ESM requires `.js` extensions in import paths even for `.ts` source files
- `import { db } from './db.js'` ← correct even though file is `db.ts`

**TanStack Query stale data**
- Check that mutations call `queryClient.invalidateQueries(['key'])`
- Cache key must exactly match the `queryKey` in `useQuery`

**Auth 401 on protected route**
- Confirm `requireAuth` middleware is applied before the handler
- Check session cookie is being sent (check `credentials: 'include'` in fetch)

**Drizzle type mismatch**
- Re-run `npm run check` after `npm run db:push`
- Ensure `createInsertSchema`/`createSelectSchema` from `drizzle-zod` is used, not hand-written types

**Aria raw SQL error**
- `aria_*` tables are not in Drizzle schema — changes need raw `ALTER TABLE` SQL or recreation
- Check `server/aria-memory.ts` for the current table definitions
