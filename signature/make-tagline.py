#!/usr/bin/env python3
"""Build the animated tagline GIF used by the email signature.

Email clients strip CSS and JavaScript, so the only motion that survives
in Gmail and Apple Mail is an animated image. Each frame is stored whole.
Partial frames leave the previous word on screen. Outlook on Windows
shows the text "get done" in place of this image.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SCALE = 2
FONT_PX = 22 * SCALE
LINE_H = 28 * SCALE
BG = (11, 13, 18, 255)  # #0b0d12, same as the signature card
ORANGE = (255, 122, 26, 255)  # #ff7a1a
GOLD = (255, 181, 71, 255)  # #ffb547
FONT_CANDIDATES = [
    Path("/tmp/SpaceGrotesk-Bold.ttf"),
    ROOT / "SpaceGrotesk-Bold.ttf",
    Path("/usr/share/fonts/truetype/space-grotesk/SpaceGrotesk-Bold.ttf"),
]

WORDS = [
    "get done",
    "be wired right",
    "be up to code",
    "be secured",
    "be drafted",
    "be built",
    "be fixed",
    "be designed",
    "run faster",
    "look great",
    "ride safer",
    "be figured out",
]

TYPE_MS = 90
DELETE_MS = 45
HOLD_MS = 2200
BLINK_MS = 500
CARET_GAP = 4 * SCALE
CARET_W = 2 * SCALE
CARET_H = 22 * SCALE


def font_path():
    for path in FONT_CANDIDATES:
        if path.exists():
            return path
    raise SystemExit("Space Grotesk Bold was not found. Download latin-700-normal.ttf to /tmp/SpaceGrotesk-Bold.ttf.")


def render(text, caret_on, font, width):
    frame = Image.new("RGBA", (width, LINE_H), BG)
    draw = ImageDraw.Draw(frame)
    draw.text((0, LINE_H // 2), text, font=font, fill=ORANGE, anchor="lm")
    if caret_on:
        text_w = int(round(font.getlength(text))) if text else 0
        x0 = text_w + CARET_GAP
        y0 = (LINE_H - CARET_H) // 2
        draw.rectangle([x0, y0, x0 + CARET_W - 1, y0 + CARET_H - 1], fill=GOLD)
    return frame


def background_first(frames):
    """Disposal restores the screen to palette index 0 between frames."""
    bg = BG[:3]
    palette = list(frames[0].getpalette())
    count = len(palette) // 3
    nearest = min(
        range(count),
        key=lambda i: sum((palette[i * 3 + c] - bg[c]) ** 2 for c in range(3)),
    )
    if nearest == 0:
        return frames
    for channel in range(3):
        palette[channel], palette[nearest * 3 + channel] = (
            palette[nearest * 3 + channel],
            palette[channel],
        )
    table = list(range(256))
    table[0], table[nearest] = nearest, 0
    fixed = []
    for frame in frames:
        moved = frame.point(table)
        moved.putpalette(palette)
        fixed.append(moved)
    return fixed


def quantize(frames):
    sheet = Image.new("RGB", (frames[0].width, frames[0].height * min(8, len(frames))))
    step = max(1, len(frames) // 8)
    for i, frame in enumerate(frames[::step][:8]):
        sheet.paste(frame.convert("RGB"), (0, i * frame.height))
    palette = sheet.quantize(colors=48, method=Image.Quantize.MEDIANCUT)
    out = []
    for frame in frames:
        converted = frame.convert("RGB").quantize(palette=palette, dither=Image.Dither.NONE)
        out.append(converted)
    return out


def main():
    font = ImageFont.truetype(font_path(), FONT_PX)
    longest = max(font.getlength(word) for word in WORDS)
    width = int(round(longest)) + CARET_GAP + CARET_W + 2 * SCALE
    if width % 2:
        width += 1

    frames = []
    durations = []

    def add(text, caret, ms):
        frames.append(render(text, caret, font, width))
        durations.append(ms)

    def play(word):
        for count in range(1, len(word) + 1):
            add(word[:count], True, TYPE_MS)
        # Blink the caret while the finished word sits, same 1s blink as the design.
        left = HOLD_MS
        caret = True
        while left > 0:
            step = min(BLINK_MS, left)
            add(word, caret, step)
            caret = not caret
            left -= step
        for count in range(len(word) - 1, -1, -1):
            add(word[:count], True, DELETE_MS)

    for word in WORDS:
        play(word)

    paletted = background_first(quantize(frames))
    gif_path = ROOT / "tagline.gif"
    # Full frames, no delta compression. Optimized deltas leave the previous
    # word on screen in some mail clients.
    paletted[0].save(
        gif_path,
        save_all=True,
        append_images=paletted[1:],
        duration=durations,
        loop=0,
        optimize=False,
        disposal=2,
    )

    print(f"gif {gif_path.name} {gif_path.stat().st_size} bytes")
    print(f"frames {len(frames)} size {width}x{LINE_H} display {width // SCALE}x{LINE_H // SCALE}")

    # Contact sheet of each full word, for a visual check.
    thumbs = []
    for word in WORDS:
        thumbs.append(render(word, True, font, width).convert("RGB"))
    sheet = Image.new("RGB", (width, LINE_H * len(thumbs)), BG[:3])
    for i, thumb in enumerate(thumbs):
        sheet.paste(thumb, (0, i * LINE_H))
    sheet.save("/tmp/tagline-words.png")


if __name__ == "__main__":
    main()
