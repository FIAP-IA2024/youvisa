---
tags:
  - learning
  - claude-sdk
  - docker
  - auth
related:
  - "[[../specs/2026-04-26-sprint-4-multi-agent/spec]]"
created: 2026-04-27
---
# Claude OAuth tokens expire ~ every 8 hours — sync from macOS Keychain on demand

The Claude Code OAuth tokens used to authenticate the Anthropic Messages API directly (for vision
classification) live in `~/.claude/.credentials.json` *inside* the agent container, and they
expire roughly every 8 hours. The Claude Agent SDK refreshes them automatically when it makes a
call, but **our code calls the Messages API via raw `fetch` for multimodal vision** (the SDK has
no multimodal API as of v0.2.x), so it doesn't trigger the SDK's refresh logic. When the token
expires, every classifier call returns 401 until the token is replaced.

The host's fresh token lives in macOS Keychain under the service `Claude Code-credentials`,
and Claude Desktop refreshes it whenever it's running. The cleanest fix is a setup script that
copies the Keychain blob into the container's `/home/node/.claude/.credentials.json` on demand:

```bash
security find-generic-password -s "Claude Code-credentials" -w > /tmp/fresh-creds.json
docker cp /tmp/fresh-creds.json youvisa-agent:/home/node/.claude/.credentials.json
docker exec --user root youvisa-agent sh -c \
  'chown node:node /home/node/.claude/.credentials.json && chmod 600 /home/node/.claude/.credentials.json'
```

## Context

Discovered while preparing the Sprint 4 demo recording. The classifier had been working a day
earlier; on the demo day every Claude Vision call returned `401 authentication_error`, then `429
rate_limit_error` on Sonnet (because we were retrying a stale token under load). Decoding the
`expiresAt` field in the credentials file showed the in-container token had expired ~1 hour
earlier; the host's Keychain copy was still valid for ~7 more hours.

A second pitfall: an older revision of `claude-vision.ts` cached the token at module load time
(`let _accessToken`) and preferred `process.env.CLAUDE_CODE_OAUTH_TOKEN` over the file. The shell
that started Docker had inherited a Claude *Desktop* token (a different account) into its
environment, so the container kept using that stale token even after we synced the credentials
file. Fix: re-read the file every call (no cache), and don't inherit `CLAUDE_CODE_OAUTH_TOKEN`
into the container at all (`docker-compose.yml` no longer maps that env var).

## How to Apply

**Day-to-day:** run `bash scripts/setup-demo-v2.sh` before any session that calls the Anthropic
API directly (vision classification, demo recording). It's idempotent and takes <2s. The script
also re-points the Telegram webhook at the active ngrok URL so a fresh `claude` session won't
silently fail because of stale infra.

**In code:** never cache OAuth tokens in module scope and never let a process-level
`CLAUDE_CODE_OAUTH_TOKEN` override the file unless it's >40 chars (a real long-lived service
token, not a stale Claude Desktop blob). The credentials file is the source of truth — re-read
it on every authenticated call. If the file is missing or unreadable, fail loudly with a hint to
run the sync script.

**System prompt note:** if a multimodal request returns 400 with a content-policy error, prepend
`"You are Claude Code, ..."` to the system prompt — OAuth tokens minted by Claude Code expect
that preamble, not arbitrary system prompts. Haiku is more permissive than Sonnet here.
