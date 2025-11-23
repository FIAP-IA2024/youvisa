#!/bin/bash

set -e

# Colors
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

APP=$1

if [ -z "$APP" ]; then
    echo -e "${RED}Error: No app specified${NC}"
    echo -e "Available options: backend, n8n, ocr, all"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Run: cp .env.example .env"
    echo "Then edit .env with your credentials"
    exit 1
fi

start_backend() {
    echo -e "${BLUE}Starting Backend API...${NC}"
    docker-compose up -d --build backend

    # Get port from .env
    API_PORT=$(grep -E "^API_PORT=" .env | cut -d '=' -f2)
    API_PORT=${API_PORT:-5555}

    echo -e "${BLUE}Backend API started!${NC}"
    echo -e "API: http://localhost:${API_PORT}"
}

start_n8n() {
    echo -e "${BLUE}Starting n8n...${NC}"

    # Check if ngrok is needed
    if command -v ngrok &> /dev/null; then
        echo -e "${BLUE}Setting up ngrok tunnel...${NC}"
        pkill -f ngrok 2>/dev/null || true
        nohup ngrok http 5678 > /tmp/ngrok.log 2>&1 &
        sleep 4

        # Get ngrok URL
        URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys, json; data = json.load(sys.stdin); print([t['public_url'] for t in data['tunnels'] if t['public_url'].startswith('https')][0])" 2>/dev/null || echo "")

        if [ -n "$URL" ]; then
            echo -e "${BLUE}ngrok URL: $URL${NC}"
            # Update WEBHOOK_URL in .env
            if grep -q "^WEBHOOK_URL=" .env; then
                sed -i.bak "s|^WEBHOOK_URL=.*|WEBHOOK_URL=$URL/|" .env
            else
                echo "WEBHOOK_URL=$URL/" >> .env
            fi
        fi
    fi

    docker-compose up -d n8n
    echo -e "${BLUE}n8n started!${NC}"
    echo -e "n8n: http://localhost:5678"
}

start_ocr() {
    echo -e "${BLUE}Starting OCR service...${NC}"
    docker-compose up -d --build ocr

    # Get port from .env or default
    OCR_PORT=3001

    echo -e "${BLUE}OCR service started!${NC}"
    echo -e "API: http://localhost:${OCR_PORT}"
    echo -e "Watch folder: app/ocr/watch/"
}

start_all() {
    echo -e "${BLUE}Starting all services...${NC}"
    start_backend
    sleep 2
    start_n8n
    sleep 2
    start_ocr
    echo ""
    echo -e "${BLUE}All services started!${NC}"
    docker-compose ps
}

case "$APP" in
    backend)
        start_backend
        ;;
    n8n)
        start_n8n
        ;;
    ocr)
        start_ocr
        ;;
    all)
        start_all
        ;;
    *)
        echo -e "${RED}Error: Unknown app '${APP}'${NC}"
        echo -e "Available options: backend, n8n, ocr, all"
        exit 1
        ;;
esac
