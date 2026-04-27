#!/usr/bin/env python3
"""
Generate a synthetic passport image for the demo recording.

Output: /tmp/demo-passport.jpg (1240x880)

Designed to:
- Pass the validation service (>=400x400, blur >=100, brightness 40-220)
- Be classified as "Passaporte" by Claude Vision (passport-shaped layout
  with the canonical Brazilian passport visual cues — green cover hint,
  laurel crest, MRZ band, photo placeholder, identity fields)
"""
from PIL import Image, ImageDraw, ImageFont
import random
import sys

W, H = 1240, 880
OUT = "/tmp/demo-passport.jpg"

# Font discovery — fall back across common macOS paths
def font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    for p in candidates:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()

mono = font(22)
small = font(18)
medium = font(28)
large = font(40, bold=True)
huge = font(72, bold=True)
title = font(36, bold=True)


# Page background — dark green with subtle pattern
img = Image.new("RGB", (W, H), (18, 64, 44))
d = ImageDraw.Draw(img)

# Subtle linear noise (security-paper feel)
random.seed(42)
for _ in range(8000):
    x = random.randint(0, W - 1)
    y = random.randint(0, H - 1)
    shade = random.randint(-12, 12)
    base = (18, 64, 44)
    color = tuple(max(0, min(255, c + shade)) for c in base)
    d.point((x, y), fill=color)

# Top emblem area — laurel-style circle
cx, cy, r = W // 2, 110, 60
d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(245, 230, 140), width=3)
d.ellipse([cx - r + 10, cy - r + 10, cx + r - 10, cy + r - 10], outline=(245, 230, 140), width=2)
# central diamond
d.polygon([
    (cx, cy - 22), (cx + 22, cy), (cx, cy + 22), (cx - 22, cy)
], outline=(245, 230, 140), width=2)

# Title
d.text((W // 2, 200), "REPÚBLICA FEDERATIVA DO BRASIL", fill=(245, 230, 140), font=title, anchor="mm")
d.text((W // 2, 250), "FEDERATIVE REPUBLIC OF BRAZIL", fill=(225, 210, 130), font=medium, anchor="mm")

# Big "PASSAPORTE" header
d.text((W // 2, 330), "PASSAPORTE", fill=(255, 255, 255), font=huge, anchor="mm")
d.text((W // 2, 380), "PASSPORT  ·  PASAPORTE", fill=(220, 220, 220), font=medium, anchor="mm")

# Identity card area — light beige rectangle
card_x, card_y, card_w, card_h = 80, 440, W - 160, 320
d.rounded_rectangle(
    [card_x, card_y, card_x + card_w, card_y + card_h],
    radius=12,
    fill=(245, 240, 220),
)

# Photo placeholder (left)
photo_x, photo_y = card_x + 30, card_y + 30
photo_w, photo_h = 220, 260
d.rectangle(
    [photo_x, photo_y, photo_x + photo_w, photo_y + photo_h],
    fill=(120, 120, 130),
    outline=(80, 80, 90),
    width=2,
)
# silhouette inside photo
sx, sy = photo_x + photo_w // 2, photo_y + 100
d.ellipse([sx - 50, sy - 50, sx + 50, sy + 50], fill=(180, 180, 190))
d.ellipse(
    [sx - 80, sy + 50, sx + 80, sy + 200],
    fill=(180, 180, 190),
)

# Fields (right side)
fields = [
    ("Tipo / Type", "P"),
    ("País Emissor / Issuing Country", "BRA"),
    ("Sobrenome / Surname", "SILVA"),
    ("Nome / Given Names", "MARIA"),
    ("Nacionalidade / Nationality", "BRASILEIRA"),
    ("Data de Nascimento / Date of Birth", "12 MAR 1992"),
    ("Sexo / Sex", "F"),
    ("Local de Nascimento / Place of Birth", "SÃO PAULO"),
    ("Data de Emissão / Date of Issue", "08 JAN 2024"),
    ("Data de Validade / Date of Expiry", "07 JAN 2034"),
]

fx = card_x + 290
fy = card_y + 30
for label, value in fields:
    d.text((fx, fy), label, fill=(110, 100, 70), font=small)
    d.text((fx, fy + 22), value, fill=(40, 40, 40), font=mono)
    fy += 50

# MRZ band (bottom of card)
mrz_y = card_y + card_h - 70
d.rectangle(
    [card_x, mrz_y, card_x + card_w, card_y + card_h],
    fill=(255, 255, 255),
)
mrz1 = "P<BRASILVA<<MARIA<<<<<<<<<<<<<<<<<<<<<<<<<<<"
mrz2 = "FA1234567<6BRA9203121F3401079<<<<<<<<<<<<<<2"
d.text((card_x + 16, mrz_y + 8), mrz1, fill=(40, 40, 40), font=mono)
d.text((card_x + 16, mrz_y + 36), mrz2, fill=(40, 40, 40), font=mono)

# Footer
d.text((W // 2, H - 40), "Documento de Viagem  ·  Travel Document", fill=(220, 210, 140), font=small, anchor="mm")

img.save(OUT, "JPEG", quality=88)
print(f"wrote {OUT} ({W}x{H})")
