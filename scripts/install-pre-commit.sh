#!/bin/bash
# Install pre-commit hook to prevent secret commits

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
HOOK_SOURCE="$SCRIPT_DIR/pre-commit-hook.sh"
HOOK_DEST=".git/hooks/pre-commit"

if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

if [ ! -f "$HOOK_SOURCE" ]; then
    echo "❌ Error: Pre-commit hook script not found at $HOOK_SOURCE"
    exit 1
fi

# Copy hook
cp "$HOOK_SOURCE" "$HOOK_DEST"
chmod +x "$HOOK_DEST"

echo "✅ Pre-commit hook installed successfully!"
echo "   Location: $HOOK_DEST"
echo ""
echo "The hook will now scan for secrets before each commit."
echo "To test, try committing a file with 'sk_test_' in it."

