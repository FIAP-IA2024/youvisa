#!/bin/bash

set -e

# Colors
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

APP=$1

if [ -z "$APP" ]; then
    echo -e "${RED}Error: No app specified${NC}"
    echo -e "Available options: s3, backend, all"
    exit 1
fi

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

deploy_backend() {
    echo -e "${BLUE}Deploying Backend infrastructure...${NC}"

    # Build and package Lambda
    echo -e "${BLUE}Building backend...${NC}"
    cd app/backend
    npm install
    npm run build
    bash scripts/package-lambda.sh
    cd ../../

    # Copy shared backend configuration
    echo -e "${BLUE}Copying shared backend.tf...${NC}"
    cp app/infrastructure/terraform/shared/backend.tf app/infrastructure/terraform/backend/backend.tf

    # Deploy with Terraform
    echo -e "${BLUE}Deploying Lambda...${NC}"
    cd app/infrastructure/terraform/backend

    # Remove local state files
    rm -rf .terraform

    terraform init -backend-config="key=backend/terraform.tfstate"
    terraform apply -auto-approve
    cd ../../../../

    echo -e "${BLUE}Backend infrastructure deployed successfully!${NC}"
}

case "$APP" in
    s3)
        deploy_s3
        ;;
    backend)
        deploy_backend
        ;;
    all)
        deploy_s3
        deploy_backend
        ;;
    *)
        echo -e "${RED}Error: Unknown app '${APP}'${NC}"
        echo -e "Available options: s3, backend, all"
        exit 1
        ;;
esac

echo -e "${BLUE}Deploy completed!${NC}"
