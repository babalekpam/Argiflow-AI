---
name: Production data access
description: User's required access boundary for production database operations.
---
Use Database → Production Database only for production data. The workspace shell DATABASE_URL is development and must not be used for production data.

**Why:** The user explicitly stated this boundary during an urgent sequence-email correction.

**How to apply:** Use the database skill's production access for any authorized production inspection. A send-path code fix does not authorize resetting/re-enrolling recipients, changing sequence timing, or modifying SMTP settings or secrets.
