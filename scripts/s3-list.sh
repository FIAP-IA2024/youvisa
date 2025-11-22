#!/bin/bash

# Colors
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Listing files in S3 bucket...${NC}"

BUCKET=$(cd app/infrastructure/terraform/s3 && terraform output -raw bucket_name 2>/dev/null)

if [ -n "$BUCKET" ]; then
    aws s3 ls s3://$BUCKET/telegram/ --recursive --human-readable
else
    echo -e "${RED}Could not get bucket name from Terraform${NC}"
    echo "Run 'make deploy' first"
fi
