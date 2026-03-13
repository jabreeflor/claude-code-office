#!/usr/bin/env python3
"""Generate Pixel Lab sprites for claude-code-office.
Usage: PIXELLAB_TOKEN=<token> python3 scripts/generate-sprites.py
"""

import urllib.request, json, base64, os, time, sys

TOKEN = os.environ.get("PIXELLAB_TOKEN", "1199b041-d406-409c-9f47-1230d5135e7e")
BASE = "https://api.pixellab.ai/v1"
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sprites")

os.makedirs(OUT, exist_ok=True)

def gen(endpoint, payload, outfile):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(f"{BASE}/{endpoint}", data=data,
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            res = json.load(r)
        if "image" in res and "base64" in res["image"]:
            img_data = base64.b64decode(res["image"]["base64"])
            path = os.path.join(OUT, outfile)
            with open(path, "wb") as f:
                f.write(img_data)
            print(f"✓ {outfile} ({len(img_data):,} bytes)")
            return True
        else:
            print(f"✗ {outfile}: {json.dumps(res)[:300]}")
    except Exception as e:
        print(f"✗ {outfile}: {e}")
    return False

SPRITES = [
    ("generate-image-pixflux", {
        "description": "pixel art GBA 16-bit game background, cozy developer office room, wooden desk with glowing computer monitor showing green code, bookshelf on wall, window showing night sky stars, desk lamp glowing warmly, swivel chair, retro game aesthetic, top-down angle, detailed pixel art",
        "image_size": {"width": 240, "height": 160},
        "view": "high top-down",
        "outline": "single color black outline",
        "shading": "medium shading",
        "detail": "highly detailed",
        "seed": 1337
    }, "office-bg.png"),

    ("generate-image-bitforge", {
        "description": "pixel art GBA sprite, small cute developer character sitting at desk, side view, relaxed idle pose, black hair, wearing hoodie, 16-bit retro game character, no background",
        "image_size": {"width": 32, "height": 32},
        "no_background": True,
        "outline": "single color black outline",
        "shading": "basic shading",
        "detail": "medium detail",
        "view": "side",
        "direction": "south",
        "seed": 100
    }, "char-idle.png"),

    ("generate-image-bitforge", {
        "description": "pixel art GBA sprite, small developer character sitting, hand on chin thinking pose, question mark thought bubble above head, 16-bit retro game character, no background",
        "image_size": {"width": 32, "height": 32},
        "no_background": True,
        "outline": "single color black outline",
        "shading": "basic shading",
        "detail": "medium detail",
        "view": "side",
        "direction": "south",
        "seed": 200
    }, "char-thinking.png"),

    ("generate-image-bitforge", {
        "description": "pixel art GBA sprite, small developer character typing furiously on keyboard, leaning forward, energetic coding pose, 16-bit retro game sprite, no background",
        "image_size": {"width": 32, "height": 32},
        "no_background": True,
        "outline": "single color black outline",
        "shading": "basic shading",
        "detail": "medium detail",
        "view": "side",
        "direction": "south",
        "seed": 300
    }, "char-coding.png"),

    ("generate-image-pixflux", {
        "description": "pixel art computer monitor screen showing green terminal code lines, glowing CRT effect, retro pixel art, 16-bit style",
        "image_size": {"width": 48, "height": 32},
        "outline": "single color black outline",
        "shading": "flat shading",
        "detail": "medium detail",
        "seed": 400
    }, "terminal.png"),
]

print(f"Generating {len(SPRITES)} sprites...")
for endpoint, payload, outfile in SPRITES:
    gen(endpoint, payload, outfile)
    time.sleep(1)

print("Done.")
