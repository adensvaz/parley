#!/usr/bin/env python3
"""Generate the Parley app icon.

A four-bar waveform on a bone squircle: the pine bar is the rep, the two sage bars
are the prospect, the vermillion bar is Parley's cue landing at the end of the turn.
Daylight palette, same as the product.
"""
from PIL import Image, ImageDraw, ImageFilter
import sys

S = 1024                    # master canvas
PAD = int(S * 0.085)        # macOS icons sit inset
BOX = S - PAD * 2
R = int(BOX * 0.235)        # squircle corner radius

BONE = (247, 244, 237, 255)     # card background
EDGE = (230, 224, 211, 255)     # hairline border
PINE = (29, 61, 53, 255)        # rep
SAGE = (167, 184, 177, 255)     # prospect
VERM = (201, 80, 44, 255)       # Parley's cue

# (x-offset, height) as fractions of the squircle box — measured off the reference mark.
BARS = [
    (0.215, 0.287, PINE),
    (0.383, 0.516, SAGE),
    (0.553, 0.398, SAGE),
    (0.725, 0.180, VERM),
]
BAR_W = 0.117


def main(out_png: str) -> None:
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    # soft drop shadow under the squircle
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [PAD, PAD + int(S * 0.012), S - PAD, S - PAD + int(S * 0.012)],
        radius=R, fill=(23, 22, 20, 38))
    img = Image.alpha_composite(img, sh.filter(ImageFilter.GaussianBlur(int(S * 0.018))))

    d = ImageDraw.Draw(img)
    d.rounded_rectangle([PAD, PAD, S - PAD, S - PAD], radius=R, fill=BONE, outline=EDGE, width=max(1, int(S * 0.003)))

    cy = PAD + BOX / 2                      # every bar is centred on the same axis
    w = BOX * BAR_W
    for fx, fh, colour in BARS:
        x0 = PAD + BOX * fx
        h = BOX * fh
        d.rounded_rectangle(
            [int(x0), int(cy - h / 2), int(x0 + w), int(cy + h / 2)],
            radius=int((w - 2) / 2),        # just under half-width → true pill caps
            fill=colour,
        )

    img.save(out_png)
    print(f"wrote {out_png}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "icon.png")
