#!/bin/bash
# =============================================================================
# LiveKit Setup Script - Apple Principal Engineer ICT Level 7 Standard
# =============================================================================
# Purpose: Interactive setup wizard for LiveKit configuration
# Usage: ./scripts/setup-livekit.sh
# =============================================================================

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Paths
REACT_ENV=".env"
RUST_ENV="wilbur-api/.env"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  🎥 LiveKit Setup Wizard${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}This wizard will help you configure LiveKit for real-time video/audio.${NC}"
echo ""

# =============================================================================
# Step 1: Check if LiveKit account exists
# =============================================================================
echo -e "${BOLD}Step 1: LiveKit Account${NC}"
echo ""
echo -e "Do you have a LiveKit Cloud account?"
echo -e "  ${GREEN}✓${NC} Yes, I have an account"
echo -e "  ${YELLOW}✗${NC} No, I need to create one"
echo ""
read -p "Enter your choice (y/n): " has_account

if [[ "$has_account" != "y" && "$has_account" != "Y" ]]; then
  echo ""
  echo -e "${YELLOW}📝 Creating a LiveKit account:${NC}"
  echo ""
  echo -e "  1. Visit: ${CYAN}https://cloud.livekit.io/${NC}"
  echo -e "  2. Click 'Sign Up' (free tier available)"
  echo -e "  3. Verify your email"
  echo -e "  4. Create a project named 'Wilbur Trading Room'"
  echo ""
  echo -e "${YELLOW}Press Enter when you've created your account...${NC}"
  read
fi

# =============================================================================
# Step 2: Get LiveKit credentials
# =============================================================================
echo ""
echo -e "${BOLD}Step 2: LiveKit Credentials${NC}"
echo ""
echo -e "To get your credentials:"
echo -e "  1. Go to your LiveKit project dashboard"
echo -e "  2. Click ${CYAN}Settings${NC} → ${CYAN}Keys${NC}"
echo -e "  3. Click ${CYAN}Create API Key${NC}"
echo -e "  4. Copy the credentials (you'll only see them once!)"
echo ""

# Get API Key
echo -e "${CYAN}Enter your LiveKit API Key:${NC}"
echo -e "${YELLOW}(Format: APIxxxxxxxxxxxxxxxxx)${NC}"
read -p "> " livekit_api_key

# Validate API Key format
if [[ ! "$livekit_api_key" =~ ^API ]]; then
  echo -e "${RED}⚠ Warning: API Key should start with 'API'${NC}"
  read -p "Continue anyway? (y/n): " continue_anyway
  if [[ "$continue_anyway" != "y" ]]; then
    echo -e "${RED}Setup cancelled.${NC}"
    exit 1
  fi
fi

# Get API Secret
echo ""
echo -e "${CYAN}Enter your LiveKit API Secret:${NC}"
echo -e "${YELLOW}(Format: SECRETxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)${NC}"
read -s -p "> " livekit_api_secret
echo ""

# Validate API Secret format
if [[ ! "$livekit_api_secret" =~ ^SECRET ]]; then
  echo -e "${RED}⚠ Warning: API Secret should start with 'SECRET'${NC}"
  read -p "Continue anyway? (y/n): " continue_anyway
  if [[ "$continue_anyway" != "y" ]]; then
    echo -e "${RED}Setup cancelled.${NC}"
    exit 1
  fi
fi

# Get WebSocket URL
echo ""
echo -e "${CYAN}Enter your LiveKit WebSocket URL:${NC}"
echo -e "${YELLOW}(Format: wss://your-project-xxxxx.livekit.cloud)${NC}"
read -p "> " livekit_url

# Validate URL format
if [[ ! "$livekit_url" =~ ^wss:// ]]; then
  echo -e "${RED}⚠ Warning: URL should start with 'wss://'${NC}"
  read -p "Continue anyway? (y/n): " continue_anyway
  if [[ "$continue_anyway" != "y" ]]; then
    echo -e "${RED}Setup cancelled.${NC}"
    exit 1
  fi
fi

# =============================================================================
# Step 3: Update configuration files
# =============================================================================
echo ""
echo -e "${BOLD}Step 3: Updating Configuration${NC}"
echo ""

# Backup existing files
if [ -f "$REACT_ENV" ]; then
  cp "$REACT_ENV" "$REACT_ENV.backup"
  echo -e "${GREEN}✓${NC} Backed up React .env to .env.backup"
fi

if [ -f "$RUST_ENV" ]; then
  cp "$RUST_ENV" "$RUST_ENV.backup"
  echo -e "${GREEN}✓${NC} Backed up Rust .env to wilbur-api/.env.backup"
fi

# Update React .env
if [ -f "$REACT_ENV" ]; then
  # Update existing file
  if grep -q "VITE_LIVEKIT_URL=" "$REACT_ENV"; then
    sed -i '' "s|VITE_LIVEKIT_URL=.*|VITE_LIVEKIT_URL=$livekit_url|" "$REACT_ENV"
  else
    echo "VITE_LIVEKIT_URL=$livekit_url" >> "$REACT_ENV"
  fi
  
  if grep -q "VITE_DEBUG_LIVEKIT=" "$REACT_ENV"; then
    sed -i '' "s|VITE_DEBUG_LIVEKIT=.*|VITE_DEBUG_LIVEKIT=true|" "$REACT_ENV"
  else
    echo "VITE_DEBUG_LIVEKIT=true" >> "$REACT_ENV"
  fi
  
  echo -e "${GREEN}✓${NC} Updated React .env"
else
  echo -e "${RED}✗${NC} React .env not found"
fi

# Update Rust .env
if [ -f "$RUST_ENV" ]; then
  # Update existing file
  sed -i '' "s|LIVEKIT_API_KEY=.*|LIVEKIT_API_KEY=$livekit_api_key|" "$RUST_ENV"
  sed -i '' "s|LIVEKIT_API_SECRET=.*|LIVEKIT_API_SECRET=$livekit_api_secret|" "$RUST_ENV"
  sed -i '' "s|LIVEKIT_URL=.*|LIVEKIT_URL=$livekit_url|" "$RUST_ENV"
  
  echo -e "${GREEN}✓${NC} Updated Rust API .env"
else
  echo -e "${RED}✗${NC} Rust API .env not found"
fi

# =============================================================================
# Step 4: Verify configuration
# =============================================================================
echo ""
echo -e "${BOLD}Step 4: Verification${NC}"
echo ""

echo -e "${CYAN}Configuration Summary:${NC}"
echo -e "  API Key:    ${livekit_api_key:0:10}...${livekit_api_key: -5}"
echo -e "  API Secret: ${livekit_api_secret:0:10}...${livekit_api_secret: -5}"
echo -e "  URL:        $livekit_url"
echo ""

# =============================================================================
# Step 5: Next steps
# =============================================================================
echo -e "${BOLD}Step 5: Next Steps${NC}"
echo ""
echo -e "${GREEN}✓ LiveKit configuration complete!${NC}"
echo ""
echo -e "${CYAN}To start using LiveKit:${NC}"
echo ""
echo -e "  ${BOLD}1. Restart Rust API:${NC}"
echo -e "     cd wilbur-api"
echo -e "     cargo run"
echo ""
echo -e "  ${BOLD}2. Restart React App (if running):${NC}"
echo -e "     cd .."
echo -e "     pnpm dev"
echo ""
echo -e "  ${BOLD}3. Test the connection:${NC}"
echo -e "     - Open http://localhost:5173"
echo -e "     - Join a trading room"
echo -e "     - Click camera/microphone icons"
echo -e "     - Grant browser permissions"
echo -e "     - You should see your video! 🎉"
echo ""
echo -e "${CYAN}📚 For detailed documentation, see:${NC}"
echo -e "   ${BOLD}LIVEKIT_SETUP.md${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
