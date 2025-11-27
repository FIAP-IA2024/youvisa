#!/bin/bash

set -e

# Colors
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

APP=$1

if [ -z "$APP" ]; then
    echo -e "${RED}Error: No app specified${NC}"
    echo -e "Available options: tf-state, s3, api, validation, classifier, n8n, all"
    exit 1
fi

deploy_tf_state() {
    echo -e "${BLUE}Deploying Terraform State infrastructure...${NC}"
    echo -e "${BLUE}This module uses LOCAL backend (no remote state)${NC}"

    cd app/infrastructure/terraform/tf-state

    terraform init
    terraform apply -auto-approve

    echo ""
    echo -e "${BLUE}Terraform State infrastructure deployed successfully!${NC}"
    echo ""
    echo -e "${BLUE}S3 bucket and DynamoDB table created. Other modules can now use remote backend.${NC}"

    cd ../../../../
}

deploy_s3() {
    echo -e "${BLUE}Deploying S3 infrastructure...${NC}"

    # Copy shared backend configuration
    echo -e "${BLUE}Copying shared backend.tf...${NC}"
    cp app/infrastructure/terraform/shared/backend.tf app/infrastructure/terraform/s3/backend.tf

    cd app/infrastructure/terraform/s3

    # Remove local state files
    rm -rf .terraform

    terraform init -backend-config="key=s3/terraform.tfstate"
    terraform apply -auto-approve
    cd ../../../../

    echo -e "${BLUE}S3 infrastructure deployed successfully!${NC}"
}

deploy_api() {
    echo -e "${BLUE}Deploying API infrastructure...${NC}"

    # Check if .env exists
    if [ ! -f .env ]; then
        echo -e "${RED}Error: .env file not found${NC}"
        echo "Run: cp .env.example .env"
        echo "Then edit .env with your credentials"
        exit 1
    fi

    # Load environment variables from .env
    export $(grep -v '^#' .env | xargs)

    # Build and package Lambda
    echo -e "${BLUE}Building API...${NC}"
    cd app/api
    npm install
    npm run build
    bash scripts/package-lambda.sh
    cd ../../

    # Copy shared backend configuration
    echo -e "${BLUE}Copying shared backend.tf...${NC}"
    cp app/infrastructure/terraform/shared/backend.tf app/infrastructure/terraform/api/backend.tf

    # Deploy with Terraform
    echo -e "${BLUE}Deploying Lambda...${NC}"
    cd app/infrastructure/terraform/api

    # Remove local state files
    rm -rf .terraform

    terraform init -backend-config="key=api/terraform.tfstate"
    terraform apply -auto-approve \
        -var="api_key=${API_KEY}" \
        -var="mongodb_uri=${MONGODB_URI}" \
        -var="mongodb_database=${MONGODB_DATABASE}" \
        -var="s3_bucket_name=${AWS_S3_BUCKET_NAME}"
    cd ../../../../

    echo -e "${BLUE}API infrastructure deployed successfully!${NC}"
}

deploy_validation() {
    echo -e "${BLUE}Deploying Validation infrastructure...${NC}"

    # Build and package Lambda
    echo -e "${BLUE}Building Validation Lambda...${NC}"
    cd app/validation
    bash scripts/package-lambda.sh
    cd ../../

    # Get S3 bucket name from terraform s3 output
    echo -e "${BLUE}Getting S3 bucket name from terraform...${NC}"
    cd app/infrastructure/terraform/s3
    terraform init -backend-config="key=s3/terraform.tfstate" > /dev/null 2>&1
    S3_BUCKET=$(terraform output -raw bucket_name 2>/dev/null)
    cd ../../../../

    if [ -z "$S3_BUCKET" ]; then
        echo -e "${RED}Error: Could not get S3 bucket name from terraform${NC}"
        echo "Deploy S3 first: make deploy s3"
        exit 1
    fi
    echo -e "${BLUE}S3 Bucket: ${S3_BUCKET}${NC}"

    # Copy shared backend configuration
    echo -e "${BLUE}Copying shared backend.tf...${NC}"
    cp app/infrastructure/terraform/shared/backend.tf app/infrastructure/terraform/validation/backend.tf

    # Deploy with Terraform
    echo -e "${BLUE}Deploying Validation Lambda...${NC}"
    cd app/infrastructure/terraform/validation

    # Remove local state files
    rm -rf .terraform

    terraform init -backend-config="key=validation/terraform.tfstate"
    terraform apply -auto-approve \
        -var="s3_bucket_name=${S3_BUCKET}"
    cd ../../../../

    echo -e "${BLUE}Validation infrastructure deployed successfully!${NC}"
    echo -e "${BLUE}Lambda URL:${NC}"
    cd app/infrastructure/terraform/validation
    terraform output lambda_function_url
    cd ../../../../
}

deploy_classifier() {
    echo -e "${BLUE}Deploying Classifier infrastructure...${NC}"

    # Check if .env exists
    if [ ! -f .env ]; then
        echo -e "${RED}Error: .env file not found${NC}"
        echo "Run: cp .env.example .env"
        echo "Then edit .env with your credentials"
        exit 1
    fi

    # Load environment variables from .env
    export $(grep -v '^#' .env | xargs)

    # Build and package Lambda
    echo -e "${BLUE}Building Classifier Lambda...${NC}"
    cd app/classifier
    bash scripts/package-lambda.sh
    cd ../../

    # Get S3 bucket name from terraform s3 output
    echo -e "${BLUE}Getting S3 bucket name from terraform...${NC}"
    cd app/infrastructure/terraform/s3
    terraform init -backend-config="key=s3/terraform.tfstate" > /dev/null 2>&1
    S3_BUCKET=$(terraform output -raw bucket_name 2>/dev/null)
    cd ../../../../

    if [ -z "$S3_BUCKET" ]; then
        echo -e "${RED}Error: Could not get S3 bucket name from terraform${NC}"
        echo "Deploy S3 first: make deploy s3"
        exit 1
    fi
    echo -e "${BLUE}S3 Bucket: ${S3_BUCKET}${NC}"

    # Copy shared backend configuration
    echo -e "${BLUE}Copying shared backend.tf...${NC}"
    cp app/infrastructure/terraform/shared/backend.tf app/infrastructure/terraform/classifier/backend.tf

    # Deploy with Terraform
    echo -e "${BLUE}Deploying Classifier Lambda...${NC}"
    cd app/infrastructure/terraform/classifier

    # Remove local state files
    rm -rf .terraform

    terraform init -backend-config="key=classifier/terraform.tfstate"
    terraform apply -auto-approve \
        -var="mongodb_uri=${MONGODB_URI}" \
        -var="mongodb_database=${MONGODB_DATABASE}" \
        -var="s3_bucket_name=${S3_BUCKET}" \
        -var="telegram_bot_token=${TELEGRAM_BOT_TOKEN}"
    cd ../../../../

    echo -e "${BLUE}Classifier infrastructure deployed successfully!${NC}"
}

deploy_n8n() {
    echo -e "${BLUE}Deploying n8n infrastructure...${NC}"

    # Check if .env exists
    if [ ! -f .env ]; then
        echo -e "${RED}Error: .env file not found${NC}"
        echo "Run: cp .env.example .env"
        echo "Then edit .env with your credentials"
        exit 1
    fi

    # Load environment variables from .env
    export $(grep -v '^#' .env | xargs)

    # Check required variables
    if [ -z "$N8N_SSH_KEY_NAME" ]; then
        echo -e "${RED}Error: N8N_SSH_KEY_NAME not set in .env${NC}"
        exit 1
    fi

    if [ -z "$N8N_BASIC_AUTH_PASSWORD" ] || [ "$N8N_BASIC_AUTH_PASSWORD" = "change_this_password" ]; then
        echo -e "${RED}Error: N8N_BASIC_AUTH_PASSWORD not set or using default value${NC}"
        echo "Please set a strong password in .env"
        exit 1
    fi

    if [ -z "$API_KEY" ]; then
        echo -e "${RED}Error: API_KEY not set in .env${NC}"
        exit 1
    fi

    # Get API URL from terraform api output
    echo -e "${BLUE}Getting API URL from terraform...${NC}"
    cd app/infrastructure/terraform/api
    terraform init -backend-config="key=api/terraform.tfstate" > /dev/null 2>&1
    API_URL=$(terraform output -raw lambda_function_url 2>/dev/null | sed 's:/*$::')
    cd ../../../../

    if [ -z "$API_URL" ]; then
        echo -e "${RED}Error: Could not get API URL from terraform${NC}"
        echo "Deploy the API first: make deploy api"
        exit 1
    fi
    echo -e "${BLUE}API URL: ${API_URL}${NC}"

    # Get S3 bucket name from terraform s3 output
    echo -e "${BLUE}Getting S3 bucket name from terraform...${NC}"
    cd app/infrastructure/terraform/s3
    terraform init -backend-config="key=s3/terraform.tfstate" > /dev/null 2>&1
    S3_BUCKET=$(terraform output -raw bucket_name 2>/dev/null)
    cd ../../../../

    if [ -z "$S3_BUCKET" ]; then
        echo -e "${RED}Error: Could not get S3 bucket name from terraform${NC}"
        echo "Deploy S3 first: make deploy s3"
        exit 1
    fi
    echo -e "${BLUE}S3 Bucket: ${S3_BUCKET}${NC}"

    # Get Validation Lambda URL from terraform validation output (if deployed)
    echo -e "${BLUE}Getting Validation Lambda URL from terraform...${NC}"
    cd app/infrastructure/terraform/validation
    if terraform init -backend-config="key=validation/terraform.tfstate" > /dev/null 2>&1; then
        VALIDATION_URL=$(terraform output -raw lambda_function_url 2>/dev/null || echo "")
    else
        VALIDATION_URL=""
    fi
    cd ../../../../

    if [ -z "$VALIDATION_URL" ]; then
        echo -e "${BLUE}Warning: Validation Lambda not deployed. Workflow will need manual configuration.${NC}"
        VALIDATION_URL="__VALIDATION_URL_NOT_DEPLOYED__"
    else
        echo -e "${BLUE}Validation URL: ${VALIDATION_URL}${NC}"
    fi

    # Process workflow template
    echo -e "${BLUE}Processing n8n workflow template...${NC}"
    WORKFLOW_TEMPLATE="app/n8n/workflows/telegram.template.json"
    WORKFLOW_OUTPUT="/tmp/telegram-workflow.json"

    if [ ! -f "$WORKFLOW_TEMPLATE" ]; then
        echo -e "${RED}Error: Workflow template not found: ${WORKFLOW_TEMPLATE}${NC}"
        exit 1
    fi

    # Replace placeholders with actual values
    sed -e "s|__API_URL__|${API_URL}|g" \
        -e "s|__API_KEY__|${API_KEY}|g" \
        -e "s|__S3_BUCKET__|${S3_BUCKET}|g" \
        -e "s|__VALIDATION_URL__|${VALIDATION_URL}|g" \
        "$WORKFLOW_TEMPLATE" > "$WORKFLOW_OUTPUT"

    echo -e "${BLUE}Workflow processed successfully${NC}"

    # Upload workflow to S3
    echo -e "${BLUE}Uploading workflow to S3...${NC}"
    aws s3 cp "$WORKFLOW_OUTPUT" "s3://${S3_BUCKET}/n8n/workflows/telegram.json"
    echo -e "${BLUE}Workflow uploaded to s3://${S3_BUCKET}/n8n/workflows/telegram.json${NC}"

    # Ask for domain (interactive)
    echo ""
    echo -e "${BLUE}Do you want to configure a custom domain for n8n?${NC}"
    echo "This requires you to have a domain configured in Cloudflare or similar."
    echo ""
    read -p "Enter domain (e.g., n8n.example.com) or press Enter to skip: " N8N_DOMAIN

    if [ -n "$N8N_DOMAIN" ]; then
        echo -e "${BLUE}Domain configured: ${N8N_DOMAIN}${NC}"
        echo -e "${BLUE}Make sure to create a DNS A record pointing to the EC2 IP after deploy.${NC}"
    else
        echo -e "${BLUE}No domain configured. n8n will be accessible via IP:5678${NC}"
    fi

    # Deploy with Terraform
    echo ""
    echo -e "${BLUE}Deploying n8n EC2 instance...${NC}"
    cd app/infrastructure/terraform/n8n

    # Remove local state files
    rm -rf .terraform

    terraform init
    terraform apply -auto-approve \
        -var="ssh_key_name=${N8N_SSH_KEY_NAME}" \
        -var="n8n_basic_auth_user=${N8N_BASIC_AUTH_USER:-admin}" \
        -var="n8n_basic_auth_password=${N8N_BASIC_AUTH_PASSWORD}" \
        -var="s3_bucket_name=${S3_BUCKET}" \
        -var="n8n_domain=${N8N_DOMAIN:-}" \
        -var="api_url=${API_URL}" \
        -var="api_key=${API_KEY}"

    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}n8n infrastructure deployed successfully!${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""

    PUBLIC_IP=$(terraform output -raw public_ip)

    if [ -n "$N8N_DOMAIN" ]; then
        echo -e "${BLUE}IMPORTANT: Configure your DNS now!${NC}"
        echo ""
        echo "Add an A record in Cloudflare (or your DNS provider):"
        echo "  Type: A"
        echo "  Name: ${N8N_DOMAIN%%.*}"
        echo "  Content: ${PUBLIC_IP}"
        echo "  Proxy: ON (orange cloud) for HTTPS"
        echo ""
        echo -e "${BLUE}After DNS propagation, access n8n at:${NC}"
        echo "  https://${N8N_DOMAIN}"
    else
        echo -e "${BLUE}Access n8n at:${NC}"
        terraform output n8n_url
    fi

    echo ""
    echo -e "${BLUE}SSH command:${NC}"
    terraform output -raw ssh_command
    echo ""
    echo ""
    echo -e "${BLUE}EC2 Public IP:${NC} ${PUBLIC_IP}"
    echo ""
    echo -e "${BLUE}Workflow will be automatically imported on first boot.${NC}"
    echo -e "${BLUE}You may need to configure Telegram Bot credentials in n8n.${NC}"

    cd ../../../../
}

case "$APP" in
    tf-state)
        deploy_tf_state
        ;;
    s3)
        deploy_s3
        ;;
    api)
        deploy_api
        ;;
    validation)
        deploy_validation
        ;;
    classifier)
        deploy_classifier
        ;;
    n8n)
        deploy_n8n
        ;;
    all)
        deploy_s3
        deploy_api
        deploy_validation
        deploy_classifier
        deploy_n8n
        ;;
    *)
        echo -e "${RED}Error: Unknown app '${APP}'${NC}"
        echo -e "Available options: tf-state, s3, api, validation, classifier, n8n, all"
        exit 1
        ;;
esac

echo -e "${BLUE}Deploy completed!${NC}"
