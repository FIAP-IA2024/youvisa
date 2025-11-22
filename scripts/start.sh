#!/bin/bash

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Starting YOUVISA platform...${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo -e "${YELLOW}Run: cp .env.example .env${NC}"
    echo -e "${YELLOW}Then edit .env with your credentials${NC}"
    exit 1
fi

# Start n8n
echo -e "${YELLOW}[1/3] Starting n8n container...${NC}"
docker-compose up -d
sleep 3
echo -e "${GREEN}n8n is running at http://localhost:5678${NC}"
echo ""

# Start ngrok
echo -e "${YELLOW}[2/3] Starting ngrok tunnel...${NC}"
pkill -f ngrok 2>/dev/null || true
nohup ngrok http 5678 > /tmp/ngrok.log 2>&1 &
sleep 4
echo -e "${GREEN}ngrok tunnel started${NC}"
echo ""

# Get ngrok URL
echo -e "${YELLOW}[3/3] Getting ngrok public URL...${NC}"
URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys, json; data = json.load(sys.stdin); print([t['public_url'] for t in data['tunnels'] if t['public_url'].startswith('https')][0])" 2>/dev/null || echo "")

if [ -n "$URL" ]; then
    echo -e "${GREEN}Public URL: $URL${NC}"
    echo ""
    echo -e "${YELLOW}Update WEBHOOK_URL in .env to: $URL/${NC}"
    echo -e "${YELLOW}Then run: make stop && make start${NC}"
else
    echo -e "${RED}Could not get ngrok URL${NC}"
    echo -e "${YELLOW}Check logs: tail -f /tmp/ngrok.log${NC}"
fi

echo ""
echo -e "${GREEN}Platform is ready!${NC}"
echo -e "${BLUE}Access n8n at: http://localhost:5678${NC}"
docker-compose ps
