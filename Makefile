.PHONY: help deploy start stop logs ngrok-status s3-list

help:
	@echo "\033[0;34mYOUVISA - Telegram to S3 Integration\033[0m"
	@echo ""
	@echo "\033[0;32mAvailable commands:\033[0m"
	@echo ""
	@echo "  make deploy         - Deploy AWS infrastructure (Terraform)"
	@echo "  make start          - Start everything (n8n + ngrok)"
	@echo "  make stop           - Stop everything (n8n + ngrok)"
	@echo "  make logs           - Show n8n logs"
	@echo "  make ngrok-status   - Show ngrok tunnel status and URL"
	@echo "  make s3-list        - List files in S3 bucket"
	@echo ""

deploy:
	@./scripts/deploy.sh

start:
	@./scripts/start.sh

stop:
	@./scripts/stop.sh

logs:
	@./scripts/logs.sh

ngrok-status:
	@./scripts/ngrok-status.sh

s3-list:
	@./scripts/s3-list.sh
