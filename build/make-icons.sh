#!/bin/bash

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <input-1024x1024.png>"
  exit 1
fi

INPUT="$1"

if [ ! -f "$INPUT" ]; then
  echo "Error: File '$INPUT' not found"
  exit 1
fi

echo "Generating icons from: $INPUT"

cp "$INPUT" icon.png
echo "Created: icon.png"

ICONSET="icon.iconset"
mkdir -p "$ICONSET"

sips -z 16 16     "$INPUT" --out "$ICONSET/icon_16x16.png"      > /dev/null
sips -z 32 32     "$INPUT" --out "$ICONSET/icon_16x16@2x.png"   > /dev/null
sips -z 32 32     "$INPUT" --out "$ICONSET/icon_32x32.png"      > /dev/null
sips -z 64 64     "$INPUT" --out "$ICONSET/icon_32x32@2x.png"   > /dev/null
sips -z 128 128   "$INPUT" --out "$ICONSET/icon_128x128.png"    > /dev/null
sips -z 256 256   "$INPUT" --out "$ICONSET/icon_128x128@2x.png" > /dev/null
sips -z 256 256   "$INPUT" --out "$ICONSET/icon_256x256.png"    > /dev/null
sips -z 512 512   "$INPUT" --out "$ICONSET/icon_256x256@2x.png" > /dev/null
sips -z 512 512   "$INPUT" --out "$ICONSET/icon_512x512.png"    > /dev/null
sips -z 1024 1024 "$INPUT" --out "$ICONSET/icon_512x512@2x.png" > /dev/null

iconutil -c icns "$ICONSET" -o icon.icns
rm -rf "$ICONSET"
echo "Created: icon.icns"

ICO_DIR=$(mktemp -d)
sips -z 16 16   "$INPUT" --out "$ICO_DIR/16.png"  > /dev/null
sips -z 32 32   "$INPUT" --out "$ICO_DIR/32.png"  > /dev/null
sips -z 48 48   "$INPUT" --out "$ICO_DIR/48.png"  > /dev/null
sips -z 64 64   "$INPUT" --out "$ICO_DIR/64.png"  > /dev/null
sips -z 128 128 "$INPUT" --out "$ICO_DIR/128.png" > /dev/null
sips -z 256 256 "$INPUT" --out "$ICO_DIR/256.png" > /dev/null

if command -v convert &> /dev/null; then
  convert "$ICO_DIR/16.png" "$ICO_DIR/32.png" "$ICO_DIR/48.png" \
          "$ICO_DIR/64.png" "$ICO_DIR/128.png" "$ICO_DIR/256.png" \
          icon.ico
  echo "Created: icon.ico"
elif command -v magick &> /dev/null; then
  magick "$ICO_DIR/16.png" "$ICO_DIR/32.png" "$ICO_DIR/48.png" \
         "$ICO_DIR/64.png" "$ICO_DIR/128.png" "$ICO_DIR/256.png" \
         icon.ico
  echo "Created: icon.ico"
else
  echo "Warning: ImageMagick not found, skipping icon.ico"
  echo "Install with: brew install imagemagick"
fi

rm -rf "$ICO_DIR"

echo "Done!"
