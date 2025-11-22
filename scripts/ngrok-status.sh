#!/bin/bash

# Colors
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}ngrok Status:${NC}"

if pgrep -f ngrok > /dev/null; then
    echo "Status: Running"
    sleep 2
    URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys, json; data = json.load(sys.stdin); print([t['public_url'] for t in data['tunnels'] if t['public_url'].startswith('https')][0])" 2>/dev/null || echo "")

    if [ -n "$URL" ]; then
        echo "Public URL: $URL"
    else
        echo -e "${RED}Could not get ngrok URL${NC}"
    fi
else
    echo -e "${RED}Status: Not running${NC}"
fi
