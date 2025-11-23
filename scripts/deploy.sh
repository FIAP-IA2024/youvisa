#!/bin/bash

set -e

# Colors
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

APP=$1

if [ -z "$APP" ]; then
    echo -e "${RED}Error: No app specified${NC}"
    echo -e "Available options: tf-state, s3, api, ocr, all"
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
    all)
        deploy_s3
        deploy_api
        deploy_ocr
        ;;
    *)
        echo -e "${RED}Error: Unknown app '${APP}'${NC}"
        echo -e "Available options: tf-state, s3, api, ocr, all"
        exit 1
        ;;
esac

echo -e "${BLUE}Deploy completed!${NC}"
