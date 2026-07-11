# Add API Route

Scaffold a new Express API route for ArgiFlow.

## Steps

1. Create `server/<feature>-routes.ts`:
   - Define a Zod schema for the request body in `shared/<feature>-schema.ts` (or inline if small)
   - Export a single `Router` with all handlers for this feature
   - Validate all inputs with Zod; return 400 on validation error
   - Use `requireAuth` middleware for any protected endpoint

2. Register the router in `server/routes.ts`:
   ```ts
   import { featureRouter } from './feature-routes.js';
   app.use('/api/feature', featureRouter);
   ```

3. If new DB tables are needed:
   - Add to `shared/schema.ts` using Drizzle
   - Run `npm run db:push`

4. Run `npm run check` to verify TypeScript is clean.

## Template

```ts
import { Router } from 'express';
import { z } from 'zod';
import { db } from './db.js';

export const featureRouter = Router();

const createSchema = z.object({
  name: z.string().min(1),
});

featureRouter.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    // ... db insert
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
```
