#!/bin/bash
# =============================================================================
# Deployment Validation Script - Apple Principal Engineer ICT Level 7 Standard
# =============================================================================
# Purpose: Validate GitHub Actions deployment configuration before running
# Usage: .github/scripts/validate-deployment.sh
# Exit codes: 0 = success, 1 = validation failed
# =============================================================================

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validation counters
ERRORS=0
WARNINGS=0

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  GitHub Actions Deployment Validation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# =============================================================================
# Check 1: Required Secrets
# =============================================================================
echo -e "${BLUE}[1/6]${NC} Checking required secrets..."

REQUIRED_SECRETS=(
  "VERCEL_TOKEN"
  "VERCEL_ORG_ID"
  "VERCEL_PROJECT_ID"
)

for secret in "${REQUIRED_SECRETS[@]}"; do
  if gh secret list | grep -q "^${secret}"; then
    echo -e "  ${GREEN}✓${NC} ${secret} is configured"
  else
    echo -e "  ${RED}✗${NC} ${secret} is missing"
    ((ERRORS++))
  fi
done

# =============================================================================
# Check 2: Required Variables
# =============================================================================
echo ""
echo -e "${BLUE}[2/6]${NC} Checking repository variables..."

REQUIRED_VARS=(
  "POCKETBASE_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
  if gh variable list | grep -q "^${var}"; then
    echo -e "  ${GREEN}✓${NC} ${var} is configured"
  else
    echo -e "  ${YELLOW}⚠${NC} ${var} is missing (optional)"
    ((WARNINGS++))
  fi
done

# =============================================================================
# Check 3: GitHub Environments
# =============================================================================
echo ""
echo -e "${BLUE}[3/6]${NC} Checking GitHub environments..."

REQUIRED_ENVIRONMENTS=(
  "Preview"
  "Production"
)

for env in "${REQUIRED_ENVIRONMENTS[@]}"; do
  if gh api "repos/:owner/:repo/environments/${env}" &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} ${env} environment exists"
    
    # Check protection rules for Production
    if [ "$env" = "Production" ]; then
      PROTECTION=$(gh api "repos/:owner/:repo/environments/${env}" --jq '.protection_rules')
      if [ "$PROTECTION" != "[]" ]; then
        echo -e "    ${GREEN}✓${NC} Production has protection rules"
      else
        echo -e "    ${YELLOW}⚠${NC} Production has no protection rules"
        ((WARNINGS++))
      fi
    fi
  else
    echo -e "  ${RED}✗${NC} ${env} environment not found"
    ((ERRORS++))
  fi
done

# =============================================================================
# Check 4: Workflow Syntax
# =============================================================================
echo ""
echo -e "${BLUE}[4/6]${NC} Validating workflow syntax..."

if [ -f ".github/workflows/ci.yml" ]; then
  echo -e "  ${GREEN}✓${NC} Workflow file exists"
  
  # Check for common syntax issues
  if grep -q "permissions:" ".github/workflows/ci.yml"; then
    echo -e "  ${GREEN}✓${NC} Permissions defined"
  else
    echo -e "  ${YELLOW}⚠${NC} No permissions defined (using defaults)"
    ((WARNINGS++))
  fi
  
  if grep -q "concurrency:" ".github/workflows/ci.yml"; then
    echo -e "  ${GREEN}✓${NC} Concurrency control configured"
  else
    echo -e "  ${YELLOW}⚠${NC} No concurrency control"
    ((WARNINGS++))
  fi
else
  echo -e "  ${RED}✗${NC} Workflow file not found"
  ((ERRORS++))
fi

# =============================================================================
# Check 5: Package Manager
# =============================================================================
echo ""
echo -e "${BLUE}[5/6]${NC} Checking package manager configuration..."

if [ -f "pnpm-lock.yaml" ]; then
  echo -e "  ${GREEN}✓${NC} pnpm lockfile exists"
elif [ -f "package-lock.json" ]; then
  echo -e "  ${YELLOW}⚠${NC} Using npm (consider migrating to pnpm)"
  ((WARNINGS++))
else
  echo -e "  ${RED}✗${NC} No lockfile found"
  ((ERRORS++))
fi

if [ -f "package.json" ]; then
  echo -e "  ${GREEN}✓${NC} package.json exists"
  
  # Check for required scripts
  REQUIRED_SCRIPTS=("build" "lint" "check")
  for script in "${REQUIRED_SCRIPTS[@]}"; do
    if grep -q "\"${script}\":" package.json; then
      echo -e "    ${GREEN}✓${NC} Script '${script}' defined"
    else
      echo -e "    ${RED}✗${NC} Script '${script}' missing"
      ((ERRORS++))
    fi
  done
else
  echo -e "  ${RED}✗${NC} package.json not found"
  ((ERRORS++))
fi

# =============================================================================
# Check 6: Vercel Configuration
# =============================================================================
echo ""
echo -e "${BLUE}[6/6]${NC} Checking Vercel configuration..."

if command -v vercel &> /dev/null; then
  echo -e "  ${GREEN}✓${NC} Vercel CLI installed"
  
  if [ -f ".vercel/project.json" ]; then
    echo -e "  ${GREEN}✓${NC} Vercel project linked"
    
    ORG_ID=$(jq -r '.orgId' .vercel/project.json 2>/dev/null || echo "")
    PROJECT_ID=$(jq -r '.projectId' .vercel/project.json 2>/dev/null || echo "")
    
    if [ -n "$ORG_ID" ] && [ -n "$PROJECT_ID" ]; then
      echo -e "    ${GREEN}✓${NC} Organization ID: ${ORG_ID:0:8}..."
      echo -e "    ${GREEN}✓${NC} Project ID: ${PROJECT_ID:0:8}..."
    fi
  else
    echo -e "  ${YELLOW}⚠${NC} Vercel project not linked (run 'vercel link')"
    ((WARNINGS++))
  fi
else
  echo -e "  ${YELLOW}⚠${NC} Vercel CLI not installed"
  echo -e "    Run: npm install -g vercel"
  ((WARNINGS++))
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Validation Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed!${NC}"
  echo -e "  Your deployment configuration is production-ready."
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠ ${WARNINGS} warning(s) found${NC}"
  echo -e "  Deployment will work but consider addressing warnings."
  exit 0
else
  echo -e "${RED}✗ ${ERRORS} error(s) found${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ ${WARNINGS} warning(s) found${NC}"
  fi
  echo ""
  echo -e "  ${RED}Deployment configuration is incomplete.${NC}"
  echo -e "  Please fix the errors above before deploying."
  echo ""
  echo -e "  📚 See .github/DEPLOYMENT.md for setup instructions"
  exit 1
fi
