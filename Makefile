.PHONY: help setup start stop restart logs clean ngrok-start ngrok-stop ngrok-status tf-init tf-plan tf-apply tf-destroy s3-list

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help:
	@echo "$(BLUE)YOUVISA - Telegram to S3 Integration$(NC)"
	@echo ""
	@echo "$(GREEN)Available commands:$(NC)"
	@echo ""
	@echo "$(YELLOW)Setup & Control:$(NC)"
	@echo "  make setup          - Complete setup (Terraform + n8n + ngrok)"
	@echo "  make start          - Start n8n container"
	@echo "  make stop           - Stop n8n container"
	@echo "  make restart        - Restart n8n container"
	@echo "  make logs           - Show n8n logs (Ctrl+C to exit)"
	@echo "  make clean          - Stop and remove all containers and volumes"
	@echo ""
	@echo "$(YELLOW)ngrok (Tunnel):$(NC)"
	@echo "  make ngrok-start    - Start ngrok tunnel on port 5678"
	@echo "  make ngrok-stop     - Stop ngrok tunnel"
	@echo "  make ngrok-status   - Show ngrok status and URL"
	@echo ""
	@echo "$(YELLOW)Terraform (AWS):$(NC)"
	@echo "  make tf-init        - Initialize Terraform"
	@echo "  make tf-plan        - Show Terraform plan"
	@echo "  make tf-apply       - Apply Terraform changes"
	@echo "  make tf-destroy     - Destroy all AWS resources"
	@echo "  make tf-output      - Show Terraform outputs"
	@echo ""
	@echo "$(YELLOW)S3:$(NC)"
	@echo "  make s3-list        - List files in S3 bucket"
	@echo "  make s3-list-today  - List files uploaded today"
	@echo ""

# Setup complete environment
setup:
	@echo "$(BLUE)Starting complete setup...$(NC)"
	@$(MAKE) tf-init
	@$(MAKE) tf-apply
	@echo "$(GREEN)Terraform setup complete!$(NC)"
	@echo ""
	@echo "$(YELLOW)Starting n8n...$(NC)"
	@$(MAKE) start
	@echo ""
	@echo "$(YELLOW)Please configure ngrok manually:$(NC)"
	@echo "1. Run: make ngrok-start"
	@echo "2. Copy the ngrok URL"
	@echo "3. Update WEBHOOK_URL in .env"
	@echo "4. Run: make restart"

# n8n container management
start:
	@echo "$(BLUE)Starting n8n container...$(NC)"
	@docker-compose up -d
	@sleep 3
	@docker-compose ps
	@echo "$(GREEN)n8n is running at http://localhost:5678$(NC)"

stop:
	@echo "$(BLUE)Stopping n8n container...$(NC)"
	@docker-compose stop
	@echo "$(GREEN)n8n stopped$(NC)"

restart:
	@echo "$(BLUE)Restarting n8n container...$(NC)"
	@docker-compose restart
	@sleep 3
	@docker-compose ps
	@echo "$(GREEN)n8n restarted$(NC)"

logs:
	@echo "$(BLUE)Showing n8n logs (Ctrl+C to exit)...$(NC)"
	@docker-compose logs -f n8n

clean:
	@echo "$(RED)WARNING: This will remove all containers and volumes!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "$(GREEN)Cleanup complete$(NC)"; \
	else \
		echo "$(YELLOW)Cleanup cancelled$(NC)"; \
	fi

# ngrok tunnel management
ngrok-start:
	@echo "$(BLUE)Starting ngrok tunnel on port 5678...$(NC)"
	@pkill -f ngrok || true
	@nohup ngrok http 5678 > /tmp/ngrok.log 2>&1 &
	@sleep 3
	@$(MAKE) ngrok-status

ngrok-stop:
	@echo "$(BLUE)Stopping ngrok tunnel...$(NC)"
	@pkill -f ngrok || true
	@echo "$(GREEN)ngrok stopped$(NC)"

ngrok-status:
	@echo "$(BLUE)ngrok Status:$(NC)"
	@if pgrep -f ngrok > /dev/null; then \
		echo "$(GREEN)Status: Running$(NC)"; \
		sleep 2; \
		URL=$$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; data = json.load(sys.stdin); print([t['public_url'] for t in data['tunnels'] if t['public_url'].startswith('https')][0])" 2>/dev/null); \
		if [ -n "$$URL" ]; then \
			echo "$(GREEN)Public URL: $$URL$(NC)"; \
			echo ""; \
			echo "$(YELLOW)Update your .env file:$(NC)"; \
			echo "WEBHOOK_URL=$$URL/"; \
		else \
			echo "$(RED)Could not get ngrok URL. Check logs: tail -f /tmp/ngrok.log$(NC)"; \
		fi \
	else \
		echo "$(RED)Status: Not running$(NC)"; \
		echo "Run: make ngrok-start"; \
	fi

# Terraform management
tf-init:
	@echo "$(BLUE)Initializing Terraform...$(NC)"
	@cd infrastructure/terraform/s3 && terraform init
	@echo "$(GREEN)Terraform initialized$(NC)"

tf-plan:
	@echo "$(BLUE)Running Terraform plan...$(NC)"
	@cd infrastructure/terraform/s3 && terraform plan

tf-apply:
	@echo "$(BLUE)Applying Terraform changes...$(NC)"
	@cd infrastructure/terraform/s3 && terraform apply
	@$(MAKE) tf-output

tf-destroy:
	@echo "$(RED)WARNING: This will destroy all AWS resources!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		cd infrastructure/terraform/s3 && terraform destroy; \
		echo "$(GREEN)Resources destroyed$(NC)"; \
	else \
		echo "$(YELLOW)Destroy cancelled$(NC)"; \
	fi

tf-output:
	@echo "$(BLUE)Terraform Outputs:$(NC)"
	@cd infrastructure/terraform/s3 && terraform output

# S3 management
s3-list:
	@echo "$(BLUE)Listing files in S3 bucket...$(NC)"
	@BUCKET=$$(cd infrastructure/terraform/s3 && terraform output -raw bucket_name 2>/dev/null); \
	if [ -n "$$BUCKET" ]; then \
		aws s3 ls s3://$$BUCKET/telegram/ --recursive --human-readable; \
	else \
		echo "$(RED)Could not get bucket name from Terraform$(NC)"; \
		echo "$(YELLOW)Make sure Terraform is applied first$(NC)"; \
	fi

s3-list-today:
	@echo "$(BLUE)Listing files uploaded today...$(NC)"
	@BUCKET=$$(cd infrastructure/terraform/s3 && terraform output -raw bucket_name 2>/dev/null); \
	TODAY=$$(date +%Y/%m/%d); \
	if [ -n "$$BUCKET" ]; then \
		aws s3 ls s3://$$BUCKET/telegram/$$TODAY/ --recursive --human-readable || echo "$(YELLOW)No files found for today$(NC)"; \
	else \
		echo "$(RED)Could not get bucket name from Terraform$(NC)"; \
	fi

# Check if .env file exists
check-env:
	@if [ ! -f .env ]; then \
		echo "$(RED)Error: .env file not found!$(NC)"; \
		echo "$(YELLOW)Run: cp .env.example .env$(NC)"; \
		echo "$(YELLOW)Then edit .env with your credentials$(NC)"; \
		exit 1; \
	fi
