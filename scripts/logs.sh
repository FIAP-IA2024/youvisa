#!/bin/bash

# Colors
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Showing n8n logs (Ctrl+C to exit)...${NC}"
docker-compose logs -f n8n
