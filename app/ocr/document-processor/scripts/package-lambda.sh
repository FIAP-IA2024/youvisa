#!/bin/bash

set -e

echo "Starting Lambda packaging process..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Clean previous builds
echo -e "${BLUE}Cleaning previous builds...${NC}"
rm -rf dist
rm -f dist.zip nodejs-layer.zip

# Build the application
echo -e "${BLUE}Building application...${NC}"
npm run build

# Create dist.zip (application code only)
echo -e "${BLUE}Creating dist.zip (application code)...${NC}"
cd dist
zip -r ../dist.zip .
cd ..

# Create nodejs-layer.zip (node_modules only)
echo -e "${BLUE}Creating nodejs-layer.zip (dependencies)...${NC}"
mkdir -p nodejs
cp package.json nodejs/
cp package-lock.json nodejs/ 2>/dev/null || true

cd nodejs
npm install --production --omit=dev
cd ..

zip -r nodejs-layer.zip nodejs
rm -rf nodejs

echo -e "${GREEN}Lambda packaging completed successfully!${NC}"
echo -e "${GREEN}Files created:${NC}"
echo "  - dist.zip ($(du -h dist.zip | cut -f1))"
echo "  - nodejs-layer.zip ($(du -h nodejs-layer.zip | cut -f1))"
