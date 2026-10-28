# /// script
# requires-python = ">=3.12"
# dependencies = ["pillow>=11"]
# ///
"""Regenerate every app icon in public/ from design/app-icon-source.png.

    uv run tools/make-icons.py

- apple-touch-icon.png, icon-maskable-512.png: square, full bleed, no transparency.
  iOS and Android cut their own rounded shape, so these must not be pre-rounded.
- icon-192.png, icon-512.png, favicon.png: rounded corners on a transparent background,
  for browser tabs and desktop installs, which show the image as it is.
- iOS app (ios/App/App/Assets.xcassets): the 1024 px App Store-size icon, square and opaque,
  and the launch screen: the rounded icon centered on the page color.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "app-icon-source.png"
OUT = ROOT / "public"
IOS = ROOT / "ios" / "App" / "App" / "Assets.xcassets"
PAGE = (0xF2, 0xF0, 0xEB)  # --bg in src/index.css, so the launch screen fades into the app
RADIUS = 0.2237  # corner radius as a share of the side, close to Apple's icon shape


def square(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.LANCZOS)


def rounded(img: Image.Image, size: int) -> Image.Image:
    # Draw the mask at 4x and shrink it, so the curved edge is smooth.
    big = size * 4
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, big - 1, big - 1), radius=int(big * RADIUS), fill=255)
    out = square(img, size).convert("RGBA")
    out.putalpha(mask.resize((size, size), Image.LANCZOS))
    return out


def maskable(img: Image.Image, size: int) -> Image.Image:
    # Android may crop to a circle that keeps only the middle 80%. Shrink the artwork to
    # fit inside it. The margin is the source's plain left edge stretched across, so the
    # navy matches, and the artwork's own edge fades into it.
    back = img.crop((0, 0, img.width // 20, img.height)).resize((size, size), Image.LANCZOS)
    back = back.filter(ImageFilter.GaussianBlur(size // 16))
    inner = int(size * 0.8)
    art = square(img, inner)
    feather = Image.new("L", (inner, inner), 0)
    pad = inner // 10
    ImageDraw.Draw(feather).rectangle((pad, pad, inner - pad, inner - pad), fill=255)
    feather = feather.filter(ImageFilter.GaussianBlur(pad // 2))
    off = (size - inner) // 2
    back.paste(art, (off, off), feather)
    return back


def main() -> None:
    img = Image.open(SRC).convert("RGB")
    square(img, 180).save(OUT / "apple-touch-icon.png", optimize=True)
    maskable(img, 512).save(OUT / "icon-maskable-512.png", optimize=True)
    rounded(img, 192).save(OUT / "icon-192.png", optimize=True)
    rounded(img, 512).save(OUT / "icon-512.png", optimize=True)
    rounded(img, 64).save(OUT / "favicon.png", optimize=True)
    if IOS.is_dir():
        square(img, 1024).save(IOS / "AppIcon.appiconset" / "AppIcon-512@2x.png", optimize=True)
        splash = Image.new("RGB", (2732, 2732), PAGE)
        mark = rounded(img, 520)
        splash.paste(mark, ((2732 - 520) // 2, (2732 - 520) // 2), mark)
        for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
            splash.save(IOS / "Splash.imageset" / name, optimize=True)
        print("wrote the iOS app icon and launch screen")
    print("wrote", ", ".join(p.name for p in sorted(OUT.glob("*.png"))))


if __name__ == "__main__":
    main()
