#!/usr/bin/env bash
# Generates Blockbound collectible card art (Z Image, 3:4, voxel style) into
# web/public/cards/. Voxel prompts match the game's chunky cube aesthetic.
# Sequential with --wait so the free-plan credit budget is never overspent.
# Cards without a generated PNG fall back to procedural voxel portrait art.
set -u
cd "$(dirname "$0")/../.." || exit 1
OUT=web/public/cards
STYLE="voxel art style, character built entirely from chunky 3D cubes like MagicaVoxel, isometric three-quarter view, soft ambient occlusion, vibrant saturated palette of a cute cartoon board game, thick dark outlines around the cubes, 3:4 portrait trading card composition, centered full-body voxel character standing on a small voxel diorama base, glossy collectible card illustration, clean readable silhouette, no text, no words, no letters, no watermark"

gen() {
  local file="$1"; shift
  local subject="$1"; shift
  local bg="$1"; shift
  if [ -s "$OUT/$file.png" ]; then echo "skip $file"; return 0; fi
  echo "gen $file ..."
  local url
  url=$(higgsfield generate create z_image \
    --prompt "$STYLE, subject: $subject, background scene: $bg" \
    --aspect_ratio 3:4 --wait --json 2>/dev/null | jq -r '.[0].result_url // empty')
  if [ -z "$url" ]; then echo "FAIL $file"; return 1; fi
  curl -fsSL -o "/tmp/bb-card-$file.png" "$url" && mv -f "/tmp/bb-card-$file.png" "$OUT/$file.png" && echo "ok $file" || echo "FAIL-DL $file"
}

# Wave 1 (credits permitting). Run again after topping up for the rest.
gen suburb-baker   "a friendly voxel village baker with a flour-dusted cube apron holding a golden bread loaf" "sunny green meadow with voxel cottage and picket fence" &
wait
gen suburb-gardener "a cheerful voxel girl gardener in denim overalls and straw hat watering a sunflower" "cottage garden with voxel flower beds and floating pollen cubes" &
wait
gen suburb-windmill "a spunky voxel kid riding a pinwheel toy with a red scarf billowing" "golden wheat field under a bright blue sky with blocky clouds" &
wait
gen suburb-mayor   "a portly proud voxel mayor with a big mustache, top hat and golden medallion" "town square with bunting flags and a fountain, warm afternoon light" &
wait
gen candy-gummy    "a bouncy translucent voxel gummy bear with a marshmallow helmet and bubblegum shield" "pastel pink candy landscape with lollipop trees and sprinkle cubes" &
wait

echo "DONE"
