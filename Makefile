.PHONY: help deploy start stop logs s3-list db-connect

# Colors
BLUE := \033[0;34m
RED := \033[0;31m
NC := \033[0m

help:
	@echo "$(BLUE)YOUVISA - Platform 360$(NC)"
	@echo ""
	@echo "$(BLUE)Deploy Commands:$(NC)"
	@echo "  make deploy <app>    - Deploy infrastructure (tf-state, s3, backend, all)"
	@echo "                         Examples: make deploy tf-state (run this FIRST)"
	@echo "                                  make deploy s3"
	@echo "                                  make deploy backend"
	@echo "                                  make deploy all"
	@echo ""
	@echo "$(BLUE)Start Commands:$(NC)"
	@echo "  make start <app>     - Start services (mongodb, backend, n8n, all)"
	@echo "                         Examples: make start mongodb"
	@echo "                                  make start backend"
	@echo "                                  make start n8n"
	@echo "                                  make start all"
	@echo ""
	@echo "$(BLUE)Utility Commands:$(NC)"
	@echo "  make stop            - Stop all services"
	@echo "  make logs <service>  - Show logs (mongodb, backend, n8n)"
	@echo "  make s3-list         - List files in S3 bucket"
	@echo "  make db-connect      - Connect to MongoDB shell"
	@echo ""

# Deploy command
deploy:
	@if [ "$(filter-out $@,$(MAKECMDGOALS))" = "" ]; then \
		echo "$(RED)Error: Please specify what to deploy$(NC)"; \
		echo "Available options: tf-state, s3, backend, all"; \
		echo "Example: make deploy tf-state"; \
		exit 1; \
	fi
	@./scripts/deploy.sh $(filter-out $@,$(MAKECMDGOALS))

# Start command
start:
	@if [ "$(filter-out $@,$(MAKECMDGOALS))" = "" ]; then \
		echo "$(RED)Error: Please specify what to start$(NC)"; \
		echo "Available options: mongodb, backend, n8n, all"; \
		echo "Example: make start all"; \
		exit 1; \
	fi
	@./scripts/start.sh $(filter-out $@,$(MAKECMDGOALS))

# Stop all services
stop:
	@./scripts/stop.sh

# Show logs
logs:
	@if [ "$(filter-out $@,$(MAKECMDGOALS))" = "" ]; then \
		docker-compose logs -f; \
	else \
		docker-compose logs -f $(filter-out $@,$(MAKECMDGOALS)); \
	fi

# S3 list
s3-list:
	@./scripts/s3-list.sh

# Connect to MongoDB
db-connect:
	@docker exec -it youvisa-mongodb mongosh -u admin -p admin123 --authenticationDatabase admin

# Catch-all target to prevent "No rule to make target" errors
%:
	@:
