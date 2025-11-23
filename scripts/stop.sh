#!/bin/bash

# Colors
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Stopping YOUVISA platform...${NC}"

# Stop n8n
docker-compose stop

# Stop ngrok
pkill -f ngrok 2>/dev/null || true

echo "Platform stopped"
