#!/bin/bash

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Deploying AWS infrastructure...${NC}"

# Check if Terraform is initialized
if [ ! -d "app/infrastructure/terraform/s3/.terraform" ]; then
    echo -e "${YELLOW}Initializing Terraform...${NC}"
    cd app/infrastructure/terraform/s3 && terraform init
    cd ../../../..
fi

# Apply Terraform
cd app/infrastructure/terraform/s3 && terraform apply
TERRAFORM_EXIT=$?
cd ../../../..

if [ $TERRAFORM_EXIT -ne 0 ]; then
    echo -e "${RED}Terraform deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}AWS infrastructure deployed!${NC}"
echo ""
echo -e "${BLUE}AWS Credentials:${NC}"
cd app/infrastructure/terraform/s3 && terraform output
cd ../../../..
echo ""
echo -e "${YELLOW}Update your .env file with the credentials above${NC}"
