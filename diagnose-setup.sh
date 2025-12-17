#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Diagnostic Report: Supabase Middleware Setup${NC}\n"
echo "Generated: $(date)"
echo "---"

# 1. Check Node version
echo -e "\n${BLUE}1. Node.js Version${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"
else
    echo -e "${RED}✗ Node.js not found${NC}"
fi

# 2. Check npm
echo -e "\n${BLUE}2. npm Version${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm ${NPM_VERSION}${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
fi

# 3. Check .env.local
echo -e "\n${BLUE}3. Environment Configuration${NC}"
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ .env.local exists${NC}"
    
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
        SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d= -f2-)
        echo -e "  URL: ${SUPABASE_URL}"
    else
        echo -e "${RED}  ✗ NEXT_PUBLIC_SUPABASE_URL not found${NC}"
    fi
    
    if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
        ANON_KEY=$(grep "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local | cut -d= -f2- | cut -c1-20)
        echo -e "  API Key: ${ANON_KEY}... (truncated)"
    else
        echo -e "${RED}  ✗ NEXT_PUBLIC_SUPABASE_ANON_KEY not found${NC}"
    fi
else
    echo -e "${RED}✗ .env.local not found${NC}"
fi

# 4. Check connectivity to Supabase
echo -e "\n${BLUE}4. Supabase Connectivity${NC}"
SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local 2>/dev/null | cut -d= -f2-)
if [ -n "$SUPABASE_URL" ]; then
    echo "Testing connection to: ${SUPABASE_URL}"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -I "${SUPABASE_URL}/rest/v1/" --connect-timeout 5)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        echo -e "${GREEN}✓ Supabase is reachable (HTTP ${HTTP_CODE})${NC}"
    else
        echo -e "${RED}✗ Unexpected response (HTTP ${HTTP_CODE})${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Could not determine Supabase URL${NC}"
fi

# 5. Check node_modules
echo -e "\n${BLUE}5. Dependencies${NC}"
if [ -d "node_modules" ]; then
    TOTAL_PACKAGES=$(find node_modules -maxdepth 1 -type d | wc -l)
    echo -e "${GREEN}✓ node_modules exists (${TOTAL_PACKAGES} packages)${NC}"
    
    if [ -d "node_modules/next" ]; then
        NEXT_VERSION=$(cat node_modules/next/package.json | grep '"version"' | head -1 | cut -d'"' -f4)
        echo -e "  - Next.js: ${NEXT_VERSION}"
    fi
    
    if [ -d "node_modules/@supabase/ssr" ]; then
        echo -e "  - @supabase/ssr: ${GREEN}✓ installed${NC}"
    else
        echo -e "  - @supabase/ssr: ${RED}✗ missing${NC}"
    fi
else
    echo -e "${RED}✗ node_modules not found. Run: npm install${NC}"
fi

# 6. Check build status
echo -e "\n${BLUE}6. Build Status${NC}"
if [ -d ".next" ]; then
    echo -e "${GREEN}✓ .next exists${NC}"
else
    echo -e "${YELLOW}⚠ .next not found (will be created on first run)${NC}"
fi

# 7. Check middleware.ts
echo -e "\n${BLUE}7. Middleware Configuration${NC}"
if [ -f "middleware.ts" ]; then
    echo -e "${GREEN}✓ middleware.ts exists${NC}"
    
    if grep -q "fetchWithRetry" middleware.ts; then
        echo -e "  ${GREEN}✓ Retry logic implemented${NC}"
    else
        echo -e "  ${YELLOW}⚠ Retry logic not found${NC}"
    fi
    
    if grep -q "Promise.race.*timeout" middleware.ts; then
        echo -e "  ${GREEN}✓ Timeout protection implemented${NC}"
    else
        echo -e "  ${YELLOW}⚠ Timeout protection not found${NC}"
    fi
else
    echo -e "${RED}✗ middleware.ts not found${NC}"
fi

# 8. Network test (DNS)
echo -e "\n${BLUE}8. Network Status${NC}"
if ping -c 1 8.8.8.8 &> /dev/null; then
    echo -e "${GREEN}✓ Internet connection available${NC}"
else
    echo -e "${YELLOW}⚠ No internet or DNS not responding${NC}"
fi

echo -e "\n${BLUE}---${NC}"
echo -e "${BLUE}✅ Diagnostic report complete${NC}\n"

echo -e "${BLUE}📋 Recommended Next Steps:${NC}"
echo "1. If .env.local is missing variables: Add them from Supabase Dashboard"
echo "2. If node_modules is missing: Run 'npm install'"
echo "3. If connectivity fails: Check your VPN/Firewall"
echo "4. Start dev server: npm run dev"
echo "5. Access: http://localhost:3000"
