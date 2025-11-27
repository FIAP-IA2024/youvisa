#!/bin/bash

set -e

# Colors
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

APP=$1

if [ -z "$APP" ]; then
    echo -e "${RED}Error: No app specified${NC}"
    echo -e "Available options: tf-state, s3, api, ocr, n8n, all"
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

deploy_ocr() {
    echo -e "${BLUE}Deploying OCR infrastructure...${NC}"

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
    echo -e "${BLUE}Building OCR...${NC}"
    cd app/ocr/document-processor
    npm install
    npm run build
    bash scripts/package-lambda.sh
    cd ../../../

    # Copy shared backend configuration
    echo -e "${BLUE}Copying shared backend.tf...${NC}"
    cp app/infrastructure/terraform/shared/backend.tf app/infrastructure/terraform/ocr/backend.tf

    # Deploy with Terraform
    echo -e "${BLUE}Deploying OCR Lambda...${NC}"
    cd app/infrastructure/terraform/ocr

    # Remove local state files
    rm -rf .terraform

    terraform init -backend-config="key=ocr/terraform.tfstate"
    terraform apply -auto-approve \
        -var="mongodb_uri=${MONGODB_URI}" \
        -var="mongodb_database=${MONGODB_DATABASE}" \
        -var="s3_bucket_name=${AWS_S3_BUCKET_NAME}"
    cd ../../../../

    echo -e "${BLUE}OCR infrastructure deployed successfully!${NC}"
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

    if [ -z "$LAMBDA_FUNCTION_URL" ]; then
        echo -e "${RED}Error: LAMBDA_FUNCTION_URL not set in .env${NC}"
        echo "Deploy the API first: make deploy api"
        exit 1
    fi

    if [ -z "$API_KEY" ]; then
        echo -e "${RED}Error: API_KEY not set in .env${NC}"
        exit 1
    fi

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
        -var="s3_bucket_name=${AWS_S3_BUCKET_NAME}" \
        -var="n8n_domain=${N8N_DOMAIN:-}" \
        -var="api_url=${LAMBDA_FUNCTION_URL%/}" \
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
    ocr)
        deploy_ocr
        ;;
    n8n)
        deploy_n8n
        ;;
    all)
        deploy_s3
        deploy_api
        deploy_ocr
        deploy_n8n
        ;;
    *)
        echo -e "${RED}Error: Unknown app '${APP}'${NC}"
        echo -e "Available options: tf-state, s3, api, ocr, n8n, all"
        exit 1
        ;;
esac

echo -e "${BLUE}Deploy completed!${NC}"
