.PHONY: help deploy start stop logs ngrok-status s3-list backend-dev backend-build backend-deploy db-connect

help:
	@echo "\033[0;34mYOUVISA - Platform 360\033[0m"
	@echo ""
	@echo "\033[0;32mInfrastructure Commands:\033[0m"
	@echo "  make deploy         - Deploy AWS infrastructure (Terraform S3)"
	@echo "  make start          - Start everything (MongoDB + n8n + ngrok)"
	@echo "  make stop           - Stop everything"
	@echo "  make logs           - Show n8n logs"
	@echo "  make ngrok-status   - Show ngrok tunnel status and URL"
	@echo "  make s3-list        - List files in S3 bucket"
	@echo ""
	@echo "\033[0;32mBackend API Commands:\033[0m"
	@echo "  make backend-dev    - Run backend API in development mode"
	@echo "  make backend-build  - Build backend for production"
	@echo "  make backend-deploy - Deploy backend to AWS Lambda"
	@echo ""
	@echo "\033[0;32mDatabase Commands:\033[0m"
	@echo "  make db-connect     - Connect to MongoDB shell"
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

backend-dev:
	@cd backend && npm run dev

backend-build:
	@cd backend && npm run build

backend-deploy:
	@cd backend && npm run package:lambda && cd infrastructure/terraform/lambda && terraform apply

db-connect:
	@docker exec -it youvisa-mongodb mongosh -u admin -p admin123 --authenticationDatabase admin
