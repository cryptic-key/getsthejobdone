#!/usr/bin/env python3
"""Build the animated tagline GIF used by the email signature.

Email clients strip CSS and JavaScript, so the only motion that survives
in Gmail and Apple Mail is an animated image. The first frame is the full
phrase "get done" so clients that freeze GIFs (Outlook on Windows) still
read as a finished line.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SCALE = 2
FONT_PX = 16 * SCALE
LINE_H = 22 * SCALE
BG = (11, 13, 18, 255)  # #0b0d12, same as the signature card
ORANGE = (255, 122, 26, 255)  # #ff7a1a
GOLD = (255, 181, 71, 255)  # #ffb547
FONT_PATH = "/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf"

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

TYPE_MS = 72
DELETE_MS = 34
HOLD_ON_MS = 420
HOLD_OFF_MS = 380
HOLD_BLINKS = 2


def build_gradient(width, height):
    grad = Image.new("RGBA", (width, height))
    px = grad.load()
    for x in range(width):
        t = x / max(width - 1, 1)
        color = (
            255,
            int(ORANGE[1] + (GOLD[1] - ORANGE[1]) * t),
            int(ORANGE[2] + (GOLD[2] - ORANGE[2]) * t),
            255,
        )
        for y in range(height):
            px[x, y] = color
    return grad


def render(text, caret_on, font, width, gradient):
    mask = Image.new("L", (width, LINE_H), 0)
    draw = ImageDraw.Draw(mask)
    draw.text((0, LINE_H // 2), text, font=font, fill=255, anchor="lm")
    frame = Image.composite(gradient, Image.new("RGBA", (width, LINE_H), BG), mask)
    if caret_on:
        text_w = int(round(font.getlength(text))) if text else 0
        gap = 4 * SCALE
        caret_w = SCALE + 1
        caret_h = int(FONT_PX * 0.78)
        x0 = text_w + gap
        y0 = (LINE_H - caret_h) // 2
        ImageDraw.Draw(frame).rectangle(
            [x0, y0, x0 + caret_w - 1, y0 + caret_h - 1],
            fill=GOLD,
        )
    return frame


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
    font = ImageFont.truetype(FONT_PATH, FONT_PX)
    caret_w = SCALE + 1
    gap = 4 * SCALE
    longest = max(font.getlength(word) for word in WORDS)
    width = int(round(longest)) + gap + caret_w + 3 * SCALE
    gradient = build_gradient(width, LINE_H)

    frames = []
    durations = []

    def add(text, caret, ms):
        frames.append(render(text, caret, font, width, gradient))
        durations.append(ms)

    # First frames are the full opening phrase, so a frozen GIF still reads.
    for _ in range(HOLD_BLINKS):
        add(WORDS[0], True, HOLD_ON_MS)
        add(WORDS[0], False, HOLD_OFF_MS)
    for count in range(len(WORDS[0]) - 1, -1, -1):
        add(WORDS[0][:count], True, DELETE_MS)

    for index, word in enumerate(WORDS[1:], start=1):
        for count in range(1, len(word) + 1):
            add(word[:count], True, TYPE_MS)
        for _ in range(HOLD_BLINKS):
            add(word, True, HOLD_ON_MS)
            add(word, False, HOLD_OFF_MS)
        for count in range(len(word) - 1, -1, -1):
            add(word[:count], True, DELETE_MS)

    for count in range(1, len(WORDS[0]) + 1):
        add(WORDS[0][:count], True, TYPE_MS)

    paletted = quantize(frames)
    gif_path = ROOT / "tagline.gif"
    paletted[0].save(
        gif_path,
        save_all=True,
        append_images=paletted[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=1,
    )

    print(f"gif {gif_path.name} {gif_path.stat().st_size} bytes")
    print(f"frames {len(frames)} size {width}x{LINE_H} display {width // SCALE}x{LINE_H // SCALE}")

    # Contact sheet of each full word, for a visual check.
    thumbs = []
    for word in WORDS:
        thumbs.append(render(word, True, font, width, gradient).convert("RGB"))
    sheet = Image.new("RGB", (width, LINE_H * len(thumbs)), BG[:3])
    for i, thumb in enumerate(thumbs):
        sheet.paste(thumb, (0, i * LINE_H))
    sheet.save("/tmp/tagline-words.png")


if __name__ == "__main__":
    main()
