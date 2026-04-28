# YOUVISA agent service — runs the multi-agent pipeline + Telegram webhook.
# Auth pattern adapted from /Users/gabriel/www/ribeirogab/zeno-agent.
#
# Required: Claude Code CLI installed in the image so the user can run
# `claude setup-token` once from inside the container, which writes auth
# files to /home/node/.claude (mounted as a Docker volume so they persist
# and are picked up by the @anthropic-ai/claude-agent-sdk at runtime).

FROM node:24-slim AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git python3 build-essential ca-certificates curl unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ----- Stage: deps -----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

# ----- Stage: runtime -----
FROM base AS runtime
ENV NODE_ENV=production

# Persistent home for Claude auth (mounted as volume in compose).
RUN mkdir -p /home/node/.claude /app && chown -R node:node /home/node /app

# Install deps + source as the node user so file perms match the runtime user.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

# Claude Code CLI is required for `claude setup-token`. Install as `node` user
# so the binary lands under /home/node/.local/bin and is owned correctly.
USER node
ENV HOME=/home/node
RUN curl -fsSL https://claude.ai/install.sh | bash || true
ENV PATH="/home/node/.local/bin:${PATH}"

VOLUME ["/home/node/.claude"]
EXPOSE 7777

# Run the Hono server via tsx so we don't need a separate compile step
# during dev. For production builds, switch CMD to `node dist/server.js`.
CMD ["npx", "tsx", "watch", "src/server.ts"]
