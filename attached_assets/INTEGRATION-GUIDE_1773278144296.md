# White-Label Sending Domain — Integration Guide

## What This Builds
Every ArgiFlow client can connect their own domain (e.g. hello@theirbusiness.com).
Emails come 100% from their domain — no ArgiFlow branding anywhere.

---

## Files

```
shared/domain-schema.ts              → DB table for client domains
server/domain-engine.ts              → Core domain management logic
server/domain-routes.ts              → API endpoints
server/setup-postal-domain-manager.sh → One-time VPS setup script
client/domain-setup.tsx              → Client UI page
```

---

## Step 1 — Run Setup Script on VPS (one time only)

SSH into your Hetzner server:
```bash
ssh root@89.167.73.73
```

Upload and run the setup script:
```bash
bash setup-postal-domain-manager.sh
```

Copy the output — it gives you SSH keys to add to Replit Secrets.

---

## Step 2 — Add Replit Secrets

```
POSTAL_API_KEY       = L8vbfObAPZr9rFQnrFM3TFCC
POSTAL_DB_HOST       = 89.167.73.73
POSTAL_DB_PASS       = postalpassword
POSTAL_SSH_KEY_PATH  = /etc/argiflow/postal_key
```

---

## Step 3 — Add Schema

In shared/schema.ts, add:
```typescript
export * from "./domain-schema";
```

Run: npm run db:push

---

## Step 4 — Mount Routes

In server/routes.ts:
```typescript
import domainRoutes from "./domain-routes";
app.use("/api/domains", domainRoutes);
```

---

## Step 5 — Add UI Page

Copy client/domain-setup.tsx to client/src/pages/domain-setup.tsx

In App.tsx:
```typescript
import DomainSetup from "@/pages/domain-setup";
<Route path="/dashboard/domain" component={DomainSetup} />
```

Add to sidebar:
```typescript
{ title: "Sending Domain", href: "/dashboard/domain", icon: Globe }
```

---

## Client Experience Flow

1. Client goes to Dashboard → Sending Domain
2. Clicks "Connect Domain" → enters their domain + from name/email
3. ArgiFlow shows them 3 DNS records to add (SPF, DKIM, Return Path)
4. Client adds records to their DNS provider (GoDaddy, Cloudflare, etc.)
5. Client clicks "Verify DNS" — ArgiFlow checks all 3 records
6. Domain goes Active — all future emails send from their domain

---

## What Recipients See

From: John Smith <hello@johnscompany.com>
Subject: ...
Body: ...

Zero trace of ArgiFlow. 100% their brand.
