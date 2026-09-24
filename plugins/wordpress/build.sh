#!/usr/bin/env bash
# Build the uploadable plugin zip: plugins/wordpress/dist/mykavo-<version>.zip
# The zip contains exactly one folder, mykavo/, as WordPress.org expects.
set -euo pipefail
cd "$(dirname "$0")"

version="$(sed -n 's/^ \* Version: *//p' mykavo/mykavo.php | tr -d '[:space:]')"
stable="$(sed -n 's/^Stable tag: *//p' mykavo/readme.txt | tr -d '[:space:]')"
if [ "$version" != "$stable" ]; then
  echo "Version mismatch: mykavo.php says $version, readme.txt Stable tag says $stable" >&2
  exit 1
fi

for f in mykavo/*.php mykavo/includes/*.php; do php -l "$f" > /dev/null; done
node --check mykavo/assets/app.js
node --check mykavo/assets/widget.js

mkdir -p dist
rm -f "dist/mykavo-$version.zip"
zip -rq "dist/mykavo-$version.zip" mykavo -x '*.DS_Store'
echo "Built dist/mykavo-$version.zip"
