#!/bin/sh
# Build the Chrome Web Store upload: dist/mykavo-chrome-<version>.zip
set -e
cd "$(dirname "$0")"
VERSION=$(node -p "require('./manifest.json').version")
mkdir -p dist
rm -f "dist/mykavo-chrome-$VERSION.zip"
zip -qr "dist/mykavo-chrome-$VERSION.zip" manifest.json background.js popup.html popup.css popup.js lib content icons fonts
echo "dist/mykavo-chrome-$VERSION.zip"
