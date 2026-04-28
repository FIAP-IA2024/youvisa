---
tags:
  - learning
  - nextjs
related:
  - "[[../specs/2026-04-26-sprint-4-multi-agent/spec]]"
created: 2026-04-27
---
# Next.js 16 renamed `middleware.ts` to `proxy.ts` — silently 404s the old form

Next.js 16 deprecated the `middleware.ts` file convention in favor of `proxy.ts`. The deprecation
warning at startup is gentle — `⚠ The "middleware" file convention is deprecated. Please use
"proxy" instead.` — but the consequence is **routes matched by the middleware return 404**,
not the middleware-handled response. The page itself compiles fine; turbopack just doesn't run
the matcher, and any route in the matcher's path list (`/login`, `/dashboard/*`, etc.) appears to
not exist.

To migrate: rename `src/middleware.ts` → `src/proxy.ts`, and rename the exported function from
`middleware` to `proxy`. The signature, return type, and `export const config = { matcher: [...] }`
all stay the same.

## Context

Hit during Sprint 4 demo prep. The recording script tried to navigate to `http://localhost:3010/login`
and got a 404 page. The file existed at `src/app/login/page.tsx`, the dev server was up, and other
Next routes worked fine. Logs showed `GET /login 404 in 2.9s (compile: 2.7s, proxy.ts: 118ms,
render: 71ms)` — Next did invoke `proxy.ts` as a step but couldn't find a default `proxy` export
because we still had `middleware.ts` with `export function middleware(req) {...}`. Renaming the
file *without* renaming the function gave a different error: `The Proxy file "/proxy" must export
a function named 'proxy' or a default function.` Fix is both: file + function name.

## How to Apply

Run once when bumping a Next 14/15 project to Next 16:

```bash
git mv src/middleware.ts src/proxy.ts
# In the new src/proxy.ts:
#   - export function middleware(...)  →  export function proxy(...)
```

Keep the matcher and the cookie/redirect logic exactly as they were. No changes to imports
(`NextResponse`, `NextRequest`) or the runtime semantics.

**Warning sign that this is your bug:** dev server logs show requests being routed through
`proxy.ts` even though you only have `middleware.ts`, and matched routes 404. That "proxy.ts"
mention in the log line is Next 16 telling you it expected the new file but found nothing useful
in either.
