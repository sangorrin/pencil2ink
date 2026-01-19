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
echo -e "${BLUE}Building Docker image...${NC}"
docker build -f Dockerfile -t pencil2ink-dev .

# Run the container
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Server Running! 🚀            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Application:${NC} http://localhost:8000"
echo -e "${BLUE}Press Ctrl+C to stop${NC}"
echo ""

# If port 8000 is already in use, try to free it (stop Docker container or ask to kill process)
if lsof -iTCP:8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${RED}Port 8000 appears to be in use. Attempting to free it...${NC}"

  # Try to find a Docker container that publishes port 8000
  container_id=$(docker ps --format '{{.ID}} {{.Ports}}' | awk '/0.0.0.0:8000/ {print $1; exit}') || true

  if [ -n "$container_id" ]; then
    echo "Stopping existing Docker container $container_id that uses port 8000..."
    docker stop "$container_id" || true
    echo "Stopped container $container_id."
  else
    pid=$(lsof -ti:8000)
    echo "Port 8000 is used by process PID $pid."
    read -p "Kill process $pid? [y/N]: " killconfirm
    if [ "$killconfirm" = "y" ] || [ "$killconfirm" = "Y" ]; then
      kill -9 "$pid" && echo "Killed process $pid." || {
        echo "Failed to kill process $pid. Please free port 8000 and rerun the script."
        exit 1
      }
    else
      echo "Please free port 8000 and re-run the script. Exiting."
      exit 1
    fi
  fi
fi

docker run --rm -it \
  -p 8000:8000 \
  -v "$(pwd)/backend:/app/backend" \
  -v "$(pwd)/.env:/app/.env:ro" \
  pencil2ink-dev
