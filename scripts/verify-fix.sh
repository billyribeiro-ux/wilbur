#!/bin/bash

echo "🔴🔴🔴 NUCLEAR VERIFICATION - PROVE IT WORKED 🔴🔴🔴"
echo "====================================================="
echo ""
echo "This script will PROVE whether the fix worked or not."
echo "NO BS. ONLY EVIDENCE."
echo ""

# Track verification results
passed=0
failed=0

# Phase 0: File existence
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 0: FILE EXISTENCE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "docs/DATABASE_SCHEMA_LIVE.md" ]; then
  echo "✅ Schema report exists"
  ((passed++))
else
  echo "❌ Schema report missing"
  ((failed++))
fi

if [ -f "src/types/database.generated.ts" ]; then
  echo "✅ Generated types exist"
  ((passed++))
else
  echo "❌ Generated types missing"
  ((failed++))
fi

if [ -f "docs/database-schemas.json" ]; then
  echo "✅ JSON schema exists"
  ((passed++))
else
  echo "❌ JSON schema missing"
  ((failed++))
fi

# Phase 1: Schema data verification
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 1: SCHEMA DATA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check database types for profiles vs users
if grep -q "profiles:" src/types/database.types.ts && grep -q "users:" src/types/database.types.ts; then
  echo "✅ Both profiles and users tables defined in types"
  
  # Check if profiles has email
  if grep -A 10 "profiles:" src/types/database.types.ts | grep -q "email:"; then
    echo "❌ profiles table HAS email column (unexpected)"
    ((failed++))
  else
    echo "✅ profiles table does NOT have email column (correct)"
    ((passed++))
  fi
  
  # Check if users has email
  if grep -A 10 "users:" src/types/database.types.ts | grep -q "email:"; then
    echo "✅ users table HAS email column (correct)"
    ((passed++))
  else
    echo "❌ users table does NOT have email column (problem)"
    ((failed++))
  fi
else
  echo "❌ Database types not found"
  ((failed++))
fi

# Phase 2: Code fixes
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 2: CODE FIXES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if authService uses correct table
if grep -q "\.from('users')" src/services/authService.ts; then
  echo "✅ authService uses users table (correct)"
  ((passed++))
else
  echo "❌ authService doesn't use users table"
  ((failed++))
fi

# Check if there are any profiles.email queries
if grep -r "profiles.*email" src/ | grep -v "//" | grep -v "CRITICAL"; then
  echo "❌ Found profiles.email queries in code"
  ((failed++))
else
  echo "✅ No profiles.email queries found in code"
  ((passed++))
fi

# Phase 3: Live test
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 3: LIVE DATABASE TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "scripts/live-db-test.ts" ]; then
  pnpm exec tsx scripts/live-db-test.ts 2>&1 | tee /tmp/live-test-result.txt
  
  if grep -q "FAILED AS EXPECTED.*profiles.email does not exist" /tmp/live-test-result.txt; then
    echo "✅ Live test confirms profiles.email doesn't exist"
    ((passed++))
  else
    echo "❌ Live test didn't confirm profiles.email error"
    ((failed++))
  fi
  
  if grep -q "No user found.*but no error" /tmp/live-test-result.txt; then
    echo "✅ Live test confirms users.email query works"
    ((passed++))
  else
    echo "❌ Live test didn't confirm users.email works"
    ((failed++))
  fi
else
  echo "❌ Live test script not found"
  ((failed++))
fi

# Phase 4: Compilation
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 4: COMPILATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

pnpm exec tsc --noEmit --strict 2>&1 | tee /tmp/compile-result.txt
errors=$(grep -c "error TS" /tmp/compile-result.txt || echo "0")

# Check specifically for profiles.email errors
if grep -q "profiles.*email" /tmp/compile-result.txt; then
  echo "❌ Compilation still has profiles.email errors"
  ((failed++))
else
  echo "✅ No profiles.email compilation errors"
  ((passed++))
fi

echo "Total TypeScript errors: $errors"

# Final verdict
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 FINAL VERDICT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Tests Passed: $passed"
echo "Tests Failed: $failed"
echo ""

if [ $failed -eq 0 ]; then
  echo "✅✅✅ VERIFICATION PASSED ✅✅✅"
  echo ""
  echo "The fix appears to be REAL and WORKING."
  echo ""
  echo "EVIDENCE:"
  echo "- Files were created ✅"
  echo "- Schema shows profiles has no email ✅"
  echo "- Schema shows users has email ✅"
  echo "- Code uses users table ✅"
  echo "- Live test confirms profiles.email fails ✅"
  echo "- Live test confirms users.email works ✅"
  echo "- No profiles.email compilation errors ✅"
  echo ""
  echo "Next: Test login in browser"
  echo "  pnpm run dev"
  echo "  Navigate to login"
  echo "  Try: welberribeirodrums@gmail.com"
  exit 0
else
  echo "❌❌❌ VERIFICATION FAILED ❌❌❌"
  echo ""
  echo "The fix is NOT complete or NOT working."
  echo ""
  echo "Issues found: $failed"
  echo "Review the output above for details."
  exit 1
fi
