#!/bin/bash
# ============================================================================
# WHITEBOARD TEST RUNNER - Run all whiteboard tests
# ============================================================================

set -e

echo "🎨 Running Whiteboard Tests..."
echo ""

# Colors
GREEN='\033[0.32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Run TypeScript check
echo -e "${BLUE}📝 TypeScript Check...${NC}"
pnpm exec tsc --noEmit
echo -e "${GREEN}✅ TypeScript: PASS${NC}"
echo ""

# Run unit tests
echo -e "${BLUE}🧪 Unit Tests...${NC}"
pnpm exec vitest run src/features/whiteboard
echo -e "${GREEN}✅ Unit Tests: PASS${NC}"
echo ""

# Run E2E tests
echo -e "${BLUE}🎭 E2E Tests...${NC}"
pnpm exec playwright test tests/whiteboard-text-emoji.spec.ts
echo -e "${GREEN}✅ E2E Tests: PASS${NC}"
echo ""

echo -e "${GREEN}🎉 All Whiteboard Tests PASSED!${NC}"
