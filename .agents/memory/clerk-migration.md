---
name: Clerk auth migration
description: How Replit Auth → Clerk migration was done for this app; email bridge, session compat, JIT provisioning pattern.
---

## Bridge type: EMAIL

This app's primary auth was local email/password (not Replit OIDC). The `users` table uses `gen_random_uuid()` for IDs, not the Replit subject ID. Use EMAIL as the Clerk bridge:
- Server: `sessionClaims.email` → `WHERE users.email = ?`
- JIT insert uses `passwordHash: 'clerk-managed'` to satisfy NOT NULL constraint

## Session backward-compat pattern

`express-session` is kept (not removed) because 10+ route files across the codebase check `req.session.userId` in their own local `isAuthenticated` middleware. A global Clerk bridge middleware (mounted after session, before routes) reads `getAuth(req).sessionClaims.email`, finds/creates the local user, and sets `req.session.userId = dbUser.id`. This lets all existing code keep working with zero changes to the 11 000-line routes file.

**Why:** Rewriting every `req.session.userId` reference across 10+ route files would be risky and broad. The bridge approach is minimal-change and safe.

**How to apply:** Any future auth work that bypasses Clerk (e.g., admin impersonation) should still set `req.session.userId` directly, since all route guards read that field.

## Imports in routes.ts

Replaced:
```
import { getSession } from "./replit_integrations/auth/replitAuth";
```
With:
```
import { getAuth } from "@clerk/express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
```

## passwordHash constraint

`users.passwordHash` is NOT NULL with no default. For Clerk JIT-provisioned users (who never set a local password), insert `passwordHash: 'clerk-managed'` as a sentinel value.

## Packages kept

`express-session`, `connect-pg-simple` — kept because session is still used for admin auth and the userId bridge. Only the Replit OIDC packages (openid-client, passport, memoizee) would be removable, but weren't uninstalled since they don't break anything.

## Client-side

The `useAuth()` hook was kept with the same interface (user, isLoading, isAuthenticated, logout) but now wraps Clerk's `useClerkAuth()`/`useClerk()` internally and still calls `/api/auth/user` for local DB profile data (companyName, industry, etc.). This minimized changes to the 8+ consumer components.
