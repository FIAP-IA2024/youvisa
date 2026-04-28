.PHONY: help up down logs build smoke smoke-e2e test type-check claude-setup webhook record

# Colors
BLUE := \033[0;34m
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m

help:
	@echo "$(BLUE)YOUVISA — Sprint 4 (local-only stack)$(NC)"
	@echo ""
	@echo "$(BLUE)Stack Commands:$(NC)"
	@echo "  make up                 - Start all services (mongo, minio, api, agent, validation, frontend)"
	@echo "  make down               - Stop all services"
	@echo "  make build              - Rebuild images"
	@echo "  make logs [service]     - Tail logs (default: all)"
	@echo ""
	@echo "$(BLUE)Quality:$(NC)"
	@echo "  make test               - Run vitest (api + agent) and pytest (validation)"
	@echo "  make type-check         - Run tsc --noEmit on api + agent"
	@echo "  make smoke              - Run end-to-end smoke script"
	@echo ""
	@echo "$(BLUE)One-time setup:$(NC)"
	@echo "  make claude-setup       - Run 'claude setup-token' inside agent container"
	@echo "                            (only needed if claude_home volume is empty)"
	@echo "  make webhook URL=...    - Register Telegram webhook to URL/telegram/webhook"
	@echo "                            (e.g., make webhook URL=https://abc.ngrok-free.app)"

up:
	@docker volume create claude_home > /dev/null 2>&1 || true
	@docker compose up -d
	@echo "$(GREEN)stack started.$(NC) tail logs with: make logs"

down:
	@docker compose down

build:
	@docker compose build

logs:
	@if [ "$(filter-out $@,$(MAKECMDGOALS))" = "" ]; then \
		docker compose logs -f --tail=200; \
	else \
		docker compose logs -f --tail=200 $(filter-out $@,$(MAKECMDGOALS)); \
	fi

test:
	@echo "$(BLUE)→ vitest in app/api$(NC)"
	@docker compose exec -T api npm test
	@echo ""
	@echo "$(BLUE)→ vitest in app/agent$(NC)"
	@docker compose exec -T agent npm test

type-check:
	@echo "$(BLUE)→ tsc in app/api$(NC)"
	@docker compose exec -T api npm run type-check
	@echo ""
	@echo "$(BLUE)→ tsc in app/agent (host — Docker container OOMs on Claude SDK types)$(NC)"
	@NODE_BIN=$$(ls -1 $$HOME/.nvm/versions/node 2>/dev/null | sort -V | tail -1); \
	  if [ -n "$$NODE_BIN" ] && [ -x "$$HOME/.nvm/versions/node/$$NODE_BIN/bin/node" ]; then \
	    NODE="$$HOME/.nvm/versions/node/$$NODE_BIN/bin/node"; \
	  else NODE=node; fi; \
	  cd app/agent && (test -d node_modules || $$NODE $$HOME/.nvm/versions/node/$$NODE_BIN/bin/npm install --silent) && \
	  $$NODE --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit
	@echo ""
	@echo "$(BLUE)→ tsc in app/frontend$(NC)"
	@docker compose exec -T frontend npm run type-check

smoke:
	@docker compose exec -T agent npx tsx src/scripts/smoke-pipeline.ts

smoke-e2e:
	@npx tsx scripts/smoke-e2e.ts

record:
	@bash scripts/run-demo-v2.sh

claude-setup:
	@docker compose run --rm agent claude setup-token

webhook:
	@if [ -z "$(URL)" ]; then \
		echo "$(RED)Usage: make webhook URL=https://your-ngrok.ngrok-free.app$(NC)"; \
		exit 1; \
	fi
	@docker compose exec -T agent npx tsx src/scripts/register-webhook.ts $(URL)/telegram/webhook

# Catch-all target so 'make logs api' (extra arg) doesn't error
%:
	@:
