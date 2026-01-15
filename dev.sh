#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Pencil2Ink Development           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ Error: .env file not found${NC}"
    echo "Please create .env with TAMS_URL, TAMS_APP_ID, and PRIVATE_KEY_PEM"
    exit 1
fi

echo -e "${GREEN}✓ Found .env file${NC}"

# Build the development image
echo ""
echo -e "${BLUE}Building development Docker image...${NC}"
docker build -f Dockerfile.local -t pencil2ink-dev .

# Run the container
echo ""
echo -e "${BLUE}Starting development containers...${NC}"
docker run --rm -it \
  -p 8000:8000 \
  -p 3000:3000 \
  -v "$(pwd)/backend:/app/backend" \
  -v "$(pwd)/frontend/src:/app/frontend/src" \
  -v "$(pwd)/frontend/public:/app/frontend/public" \
  -v "$(pwd)/frontend/index.html:/app/frontend/index.html" \
  -v "$(pwd)/frontend/vite.config.ts:/app/frontend/vite.config.ts" \
  -v "$(pwd)/.env:/app/.env:ro" \
  pencil2ink-dev

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Servers Running! 🚀           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}Backend:${NC}  http://localhost:8000"
echo ""
