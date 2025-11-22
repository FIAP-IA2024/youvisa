#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

APP=$1

if [ -z "$APP" ]; then
    echo -e "${RED}Error: No app specified${NC}"
    echo -e "${YELLOW}Available options: s3, backend, all${NC}"
    exit 1
fi

deploy_s3() {
    echo -e "${BLUE}Deploying S3 infrastructure...${NC}"
    cd app/infrastructure/terraform/s3
    terraform init
    terraform apply -auto-approve
    cd ../../../../
    echo -e "${GREEN}S3 infrastructure deployed successfully!${NC}"
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

    # Deploy with Terraform
    echo -e "${BLUE}Deploying Lambda...${NC}"
    cd app/infrastructure/terraform/backend
    terraform init
    terraform apply -auto-approve
    cd ../../../../

    echo -e "${GREEN}Backend infrastructure deployed successfully!${NC}"
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
        echo -e "${YELLOW}Available options: s3, backend, all${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}Deploy completed!${NC}"
