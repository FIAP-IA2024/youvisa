#!/bin/bash

set -e

# Colors
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

TEMPLATE_FILE="app/n8n/workflows/telegram.template.json"
OUTPUT_FILE="app/n8n/workflows/telegram.output.json"

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}Error: Template file not found: ${TEMPLATE_FILE}${NC}"
    exit 1
fi

echo -e "${BLUE}Generate n8n Workflow${NC}"
echo ""

# Prompt for API_URL
echo -e "${BLUE}Enter the API URL (e.g., https://xxx.lambda-url.sa-east-1.on.aws):${NC}"
read -p "> " API_URL

if [ -z "$API_URL" ]; then
    echo -e "${RED}Error: API_URL is required${NC}"
    exit 1
fi

# Remove trailing slash if present
API_URL="${API_URL%/}"

# Prompt for API_KEY
echo ""
echo -e "${BLUE}Enter the API Key:${NC}"
read -p "> " API_KEY

if [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: API_KEY is required${NC}"
    exit 1
fi

# Prompt for S3_BUCKET
echo ""
echo -e "${BLUE}Enter the S3 Bucket name:${NC}"
read -p "> " S3_BUCKET

if [ -z "$S3_BUCKET" ]; then
    echo -e "${RED}Error: S3_BUCKET is required${NC}"
    exit 1
fi

# Generate output file
echo ""
echo -e "${BLUE}Generating workflow file...${NC}"

sed -e "s|__API_URL__|${API_URL}|g" \
    -e "s|__API_KEY__|${API_KEY}|g" \
    -e "s|__S3_BUCKET__|${S3_BUCKET}|g" \
    "$TEMPLATE_FILE" > "$OUTPUT_FILE"

echo -e "${BLUE}Workflow generated successfully!${NC}"
echo ""
echo -e "Output file: ${BLUE}${OUTPUT_FILE}${NC}"
echo ""
echo -e "You can now import this file into n8n via the UI."
