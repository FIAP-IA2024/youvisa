#!/usr/bin/env bash

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m'

TEMPLATE_FILE="app/n8n/workflows/telegram.template.json"
OUTPUT_FILE="app/n8n/workflows/telegram.output.json"
ENV_FILE=".env"

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}Error: Template file not found: ${TEMPLATE_FILE}${NC}"
    exit 1
fi

# Load defaults from .env if it exists
DEFAULT_API_URL=""
DEFAULT_API_KEY=""
DEFAULT_S3_BUCKET=""
DEFAULT_VALIDATION_URL=""
DEFAULT_NLP_URL=""

if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}Loading defaults from .env...${NC}"
    while IFS='=' read -r key value || [ -n "$key" ]; do
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        case "$key" in
            LAMBDA_FUNCTION_URL)
                DEFAULT_API_URL="${value%/}"
                ;;
            API_KEY)
                DEFAULT_API_KEY="$value"
                ;;
            AWS_S3_BUCKET_NAME)
                DEFAULT_S3_BUCKET="$value"
                ;;
            LAMBDA_VALIDATION_FUNCTION_URL)
                DEFAULT_VALIDATION_URL="${value%/}"
                ;;
            LAMBDA_NLP_FUNCTION_URL)
                DEFAULT_NLP_URL="${value%/}"
                ;;
        esac
    done < "$ENV_FILE"
    echo ""
fi

echo -e "${BLUE}=== Generate n8n Workflow ===${NC}"
echo ""
echo -e "${YELLOW}Press Enter to keep the default value shown in brackets, or type a new value.${NC}"
echo ""

# Function to prompt with default value
prompt_with_default() {
    local prompt_text="$1"
    local default_value="$2"
    local var_name="$3"

    echo -e "${BLUE}${prompt_text}${NC}"
    if [ -n "$default_value" ]; then
        echo -e "${GRAY}[${default_value}]${NC}"
    fi
    read -r -p "> " input_value

    if [ -z "$input_value" ]; then
        eval "$var_name=\"$default_value\""
    else
        eval "$var_name=\"$input_value\""
    fi
}

# Prompt for API_URL
prompt_with_default "API URL (Lambda Function URL):" "$DEFAULT_API_URL" "API_URL"

if [ -z "$API_URL" ]; then
    echo -e "${RED}Error: API_URL is required${NC}"
    exit 1
fi
API_URL="${API_URL%/}"

# Prompt for API_KEY
echo ""
prompt_with_default "API Key:" "$DEFAULT_API_KEY" "API_KEY"

if [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: API_KEY is required${NC}"
    exit 1
fi

# Prompt for S3_BUCKET
echo ""
prompt_with_default "S3 Bucket Name:" "$DEFAULT_S3_BUCKET" "S3_BUCKET"

if [ -z "$S3_BUCKET" ]; then
    echo -e "${RED}Error: S3_BUCKET is required${NC}"
    exit 1
fi

# Prompt for VALIDATION_URL
echo ""
prompt_with_default "Validation Lambda URL:" "$DEFAULT_VALIDATION_URL" "VALIDATION_URL"

if [ -z "$VALIDATION_URL" ]; then
    echo -e "${RED}Error: VALIDATION_URL is required${NC}"
    exit 1
fi
VALIDATION_URL="${VALIDATION_URL%/}"

# Prompt for NLP_URL
echo ""
prompt_with_default "NLP Lambda URL:" "$DEFAULT_NLP_URL" "NLP_URL"

if [ -z "$NLP_URL" ]; then
    echo -e "${RED}Error: NLP_URL is required${NC}"
    exit 1
fi
NLP_URL="${NLP_URL%/}"

# Generate output file
echo ""
echo -e "${BLUE}Generating workflow file...${NC}"

sed -e "s|__API_URL__|${API_URL}|g" \
    -e "s|__API_KEY__|${API_KEY}|g" \
    -e "s|__S3_BUCKET__|${S3_BUCKET}|g" \
    -e "s|__VALIDATION_URL__|${VALIDATION_URL}|g" \
    -e "s|__NLP_URL__|${NLP_URL}|g" \
    "$TEMPLATE_FILE" > "$OUTPUT_FILE"

echo ""
echo -e "${GREEN}Workflow generated successfully!${NC}"
echo ""
echo -e "Output file: ${BLUE}${OUTPUT_FILE}${NC}"
echo ""
echo -e "You can now import this file into n8n via the UI."
echo ""
echo -e "${YELLOW}Values used:${NC}"
echo -e "  API URL:        ${API_URL}"
echo -e "  API Key:        ${API_KEY}"
echo -e "  S3 Bucket:      ${S3_BUCKET}"
echo -e "  Validation URL: ${VALIDATION_URL}"
echo -e "  NLP URL:        ${NLP_URL}"
