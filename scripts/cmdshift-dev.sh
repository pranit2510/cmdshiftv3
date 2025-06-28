#!/usr/bin/env bash
#
# CmdShift AI Development Script
# This script launches CmdShift in development mode with proper environment setup
#

set -e

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT="$SCRIPT_DIR/.."

# Change to root directory
cd "$ROOT"

echo "Starting CmdShift AI Development Environment..."

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
	echo "Installing dependencies..."
	npm install
fi

# Compile TypeScript if needed
if [ ! -d "out" ] || [ "$1" == "--compile" ]; then
	echo "Compiling TypeScript..."
	npm run compile
fi

# Set development environment variables
export NODE_ENV=development
export VSCODE_DEV=1
export ELECTRON_ENABLE_LOGGING=1
export ELECTRON_ENABLE_STACK_DUMPING=1

echo "Launching CmdShift AI..."

# Launch the application
./scripts/code.sh "$@"