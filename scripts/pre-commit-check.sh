#!/bin/bash

# Pre-commit check for sensitive files
# This script prevents committing Firebase service account keys and other secrets

echo "🔍 Checking for sensitive files..."

# Define patterns for sensitive files
SENSITIVE_PATTERNS=(
    "*firebase*.json"
    "*service-account*.json"
    "*-sa.json"
    "*.pem"
    "*.key"
    "*credentials*.json"
    "*secret*.json"
)

# Check if any staged files match sensitive patterns
FOUND_SENSITIVE=false
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if git diff --cached --name-only | grep -i "$pattern" > /dev/null; then
        echo "❌ ERROR: Found potentially sensitive file matching pattern: $pattern"
        git diff --cached --name-only | grep -i "$pattern"
        FOUND_SENSITIVE=true
    fi
done

# Check for specific content patterns in staged files
echo "🔍 Checking file contents for secrets..."
if git diff --cached --name-only | xargs grep -l "private_key\|client_email\|project_id.*firebase" 2>/dev/null; then
    echo "❌ ERROR: Found files containing potential Firebase credentials"
    FOUND_SENSITIVE=true
fi

if [ "$FOUND_SENSITIVE" = true ]; then
    echo ""
    echo "🚫 COMMIT BLOCKED: Sensitive files detected!"
    echo "Remove these files from staging before committing."
    echo ""
    echo "To remove a file from staging: git reset HEAD <file>"
    echo "To remove a file completely: git rm --cached <file>"
    exit 1
fi

echo "✅ No sensitive files detected"
exit 0