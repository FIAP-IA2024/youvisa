#!/bin/bash
set -e

echo "Packaging validation Lambda..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PROJECT_DIR/dist"

# Clean previous builds
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Copy source files
cp "$PROJECT_DIR/src/"*.py "$DIST_DIR/"

# Create lambda zip
cd "$DIST_DIR"
zip -r ../lambda.zip .

echo "Lambda package created: $PROJECT_DIR/lambda.zip"

# Create layer with dependencies (OpenCV needs special handling)
echo "Creating Lambda layer with dependencies..."

LAYER_DIR="$PROJECT_DIR/layer"
rm -rf "$LAYER_DIR"
mkdir -p "$LAYER_DIR/python"

# Install dependencies
python3 -m pip install \
    --platform manylinux2014_x86_64 \
    --target "$LAYER_DIR/python" \
    --implementation cp \
    --python-version 3.11 \
    --only-binary=:all: \
    -r "$PROJECT_DIR/requirements.txt"

# Create layer zip
cd "$LAYER_DIR"
zip -r ../layer.zip .

echo "Lambda layer created: $PROJECT_DIR/layer.zip"
echo "Done!"
