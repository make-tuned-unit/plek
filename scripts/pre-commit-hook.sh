#!/bin/bash
# Pre-commit hook to prevent committing secrets
# Install: cp scripts/pre-commit-hook.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Scanning for secrets...${NC}"

# Patterns to detect secrets
SECRET_PATTERNS=(
    "sk_live_[a-zA-Z0-9]{24,}"           # Stripe live keys
    "sk_test_[a-zA-Z0-9]{24,}"           # Stripe test keys
    "whsec_[a-zA-Z0-9]{24,}"             # Stripe webhook secrets
    "pk_live_[a-zA-Z0-9]{24,}"           # Stripe publishable keys
    "pk_test_[a-zA-Z0-9]{24,}"           # Stripe test publishable keys
    "eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}"  # JWT tokens
    "postgresql://[^/]+:[^@]+@"           # Database URLs with passwords
    "mongodb://[^/]+:[^@]+@"              # MongoDB URLs with passwords
    "redis://[^/]+:[^@]+@"                # Redis URLs with passwords
    "AKIA[0-9A-Z]{16}"                    # AWS access keys
    "AIza[0-9A-Za-z_-]{35}"               # Google API keys
    "ghp_[a-zA-Z0-9]{36}"                 # GitHub personal access tokens
    "gho_[a-zA-Z0-9]{36}"                 # GitHub OAuth tokens
    "ghu_[a-zA-Z0-9]{36}"                 # GitHub user-to-server tokens
    "ghs_[a-zA-Z0-9]{36}"                 # GitHub server-to-server tokens
    "ghr_[a-zA-Z0-9]{36}"                 # GitHub refresh tokens
    "xox[baprs]-[0-9a-zA-Z-]{10,48}"     # Slack tokens
    "xapp-[0-9a-zA-Z-]{92,}"             # Slack app tokens
)

# Files to check (staged files)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
    echo -e "${GREEN}✅ No files staged for commit${NC}"
    exit 0
fi

FOUND_SECRETS=0

# Check each staged file
for file in $STAGED_FILES; do
    # Skip binary files and already ignored files
    if [[ "$file" == *.png ]] || [[ "$file" == *.jpg ]] || [[ "$file" == *.jpeg ]] || \
       [[ "$file" == *.gif ]] || [[ "$file" == *.ico ]] || [[ "$file" == *.pdf ]] || \
       [[ "$file" == *.zip ]] || [[ "$file" == *.tar.gz ]] || [[ "$file" == *.mp4 ]] || \
       [[ "$file" == *.mp3 ]] || [[ "$file" == *.woff ]] || [[ "$file" == *.woff2 ]]; then
        continue
    fi
    
    # Skip if file doesn't exist (might be deleted)
    if [ ! -f "$file" ]; then
        continue
    fi
    
    # Check for secret patterns
    for pattern in "${SECRET_PATTERNS[@]}"; do
        if git diff --cached "$file" | grep -qE "$pattern"; then
            echo -e "${RED}❌ SECRET DETECTED in $file${NC}"
            echo -e "${RED}   Pattern matched: $pattern${NC}"
            FOUND_SECRETS=1
        fi
    done
    
    # Check for common secret variable names with actual values
    if git diff --cached "$file" | grep -E "(SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|DATABASE_URL|JWT_SECRET|RESEND_API_KEY)" | grep -vE "(your-|REPLACE|example|placeholder|TODO)" | grep -qE "=.*[a-zA-Z0-9]{20,}"; then
        echo -e "${RED}❌ POTENTIAL SECRET in $file${NC}"
        echo -e "${RED}   Found what looks like a real secret value${NC}"
        FOUND_SECRETS=1
    fi
done

if [ $FOUND_SECRETS -eq 1 ]; then
    echo -e "\n${RED}🚨 BLOCKED: Secrets detected in staged files!${NC}"
    echo -e "${YELLOW}Please remove secrets before committing.${NC}"
    echo -e "${YELLOW}Use environment variables instead.${NC}"
    echo -e "\n${YELLOW}See SECURITY_GUIDE.md for more information.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ No secrets detected${NC}"

# Optional: Run GitGuardian if available
if command -v ggshield &> /dev/null; then
    echo -e "${YELLOW}Running GitGuardian scan...${NC}"
    ggshield scan pre-commit
    if [ $? -ne 0 ]; then
        exit 1
    fi
fi

exit 0




