#!/bin/bash

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${BLUE}Stopping YOUVISA platform...${NC}"

# Stop n8n
docker-compose stop

# Stop ngrok
pkill -f ngrok 2>/dev/null || true

echo -e "${GREEN}Platform stopped${NC}"
