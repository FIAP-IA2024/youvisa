#!/bin/bash
set -e

echo "Packaging classifier Lambda..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PROJECT_DIR/dist"

# Clean previous builds
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Copy source files
cp "$PROJECT_DIR/src/"*.py "$DIST_DIR/"

# Install dependencies directly into dist (pymongo only, boto3 is available in Lambda)
python3 -m pip install \
    --target "$DIST_DIR" \
    --platform manylinux2014_x86_64 \
    --implementation cp \
    --python-version 3.11 \
    --only-binary=:all: \
    pymongo==4.6.1

# Create lambda zip
cd "$DIST_DIR"
zip -r ../lambda.zip .

echo "Lambda package created: $PROJECT_DIR/lambda.zip"
echo "Done!"
