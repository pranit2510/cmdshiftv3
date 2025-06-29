#!/bin/bash

echo "Testing CmdShift branding..."

# Check product.json
echo -e "\n1. Checking product.json:"
grep -E "nameShort|nameLong|applicationName" product.json | head -5

# Check package.json
echo -e "\n2. Checking package.json:"
grep -E '"name":|"author":' package.json | head -3

# Check if compiled files exist
echo -e "\n3. Checking compiled output:"
if [ -d "out" ]; then
    echo "✓ Output directory exists"
else
    echo "✗ Output directory missing"
fi

echo -e "\n4. Launch command would be:"
echo "./scripts/code.sh"
echo "or"
echo "./scripts/cmdshift-dev.sh"

echo -e "\nTo launch CmdShift AI, run:"
echo "  ./scripts/code.sh"
echo -e "\nThe window title should show 'CmdShift Dev' or 'CmdShift AI Dev'"