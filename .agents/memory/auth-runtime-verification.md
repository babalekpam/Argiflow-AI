---
name: Verify active authentication
description: Configured identity providers and completed migration tasks do not establish which authentication path is live.
---
Determine the active authentication path from runtime requests and deployed behavior before diagnosing a login failure. Provider provisioning, installed keys, or a completed migration task do not prove that the corresponding code is active.

**Why:** This workspace had a provisioned Clerk tenant while the inspected dashboard still used its own session-based login. Treating provisioning as evidence of the live login mechanism led to incorrect troubleshooting assumptions.

**How to apply:** Compare the current login handler, browser session confirmation, and deployed endpoint behavior. Do not switch authentication middleware or reset credentials merely because another provider is configured.

A successful build and a rendered Clerk sign-in page establish startup/rendering only, not successful authentication.

**Why:** A fresh sign-in screenshot rendered normally while another browser session produced a Clerk token-refresh redirect-loop warning. Those observations are compatible, not proof that either all login works or all login is broken.

**How to apply:** Report rendering checks separately from authenticated-session checks, and investigate refresh warnings before claiming end-to-end migration verification.