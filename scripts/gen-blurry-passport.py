#!/usr/bin/env python3
"""
Generate a deliberately *blurry* passport image so the demo can show
the validation service rejecting it.

The validation service's blur threshold is variance-of-Laplacian >= 100.
We apply a Gaussian blur with a large enough sigma that the variance
drops well below that, but the image is still recognizable as a
passport-shaped document (so the demo's intent — "user sent a blurry
photo" — reads correctly even before the bot's rejection message).

Output: /tmp/demo-passport-blurry.jpg (1240x880)
"""
from PIL import Image, ImageFilter

SRC = "/tmp/demo-passport.jpg"
OUT = "/tmp/demo-passport-blurry.jpg"

img = Image.open(SRC)
# Heavy Gaussian blur — drops the Laplacian variance below the
# validation service's threshold. radius=8 gives a "shaky hand"
# look, plenty for the demo.
blurred = img.filter(ImageFilter.GaussianBlur(radius=8))
blurred.save(OUT, "JPEG", quality=85)
print(f"wrote {OUT} ({img.size[0]}x{img.size[1]})")
