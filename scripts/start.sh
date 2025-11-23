#!/bin/bash

# Colors
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Starting YOUVISA platform...${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Run: cp .env.example .env"
    echo "Then edit .env with your credentials"
    exit 1
fi

# Start ngrok
echo -e "${BLUE}[1/3] Starting ngrok tunnel...${NC}"
pkill -f ngrok 2>/dev/null || true
nohup ngrok http 5678 > /tmp/ngrok.log 2>&1 &
sleep 4
echo "ngrok tunnel started"
echo ""

# Get ngrok URL and update .env
echo -e "${BLUE}[2/3] Configuring webhook URL...${NC}"
URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys, json; data = json.load(sys.stdin); print([t['public_url'] for t in data['tunnels'] if t['public_url'].startswith('https')][0])" 2>/dev/null || echo "")

if [ -n "$URL" ]; then
    echo "Public URL: $URL"

    # Update WEBHOOK_URL in .env
    if grep -q "^WEBHOOK_URL=" .env; then
        sed -i.bak "s|^WEBHOOK_URL=.*|WEBHOOK_URL=$URL/|" .env
    else
        echo "WEBHOOK_URL=$URL/" >> .env
    fi

    echo "WEBHOOK_URL updated in .env"
else
    echo -e "${RED}Could not get ngrok URL${NC}"
    echo "Check logs: tail -f /tmp/ngrok.log"
    exit 1
fi

echo ""

# Start n8n with configured webhook
echo -e "${BLUE}[3/3] Starting n8n container...${NC}"
docker-compose up -d
sleep 3
echo "n8n is running at http://localhost:5678"

echo ""
echo -e "${BLUE}Platform is ready!${NC}"
echo -e "${BLUE}Access n8n at: http://localhost:5678${NC}"
echo -e "${BLUE}Webhook URL: $URL/${NC}"
echo ""
docker-compose ps
