from __future__ import annotations
from PIL import Image, ImageDraw

_cache: dict[str, Image.Image] = {}


def _make_v(active: bool, size: int = 64) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = (255, 70, 85) if active else (78, 80, 95)
    d.ellipse([1, 1, size - 2, size - 2], fill=(*c, 255))
    s = size
    pts = [
        (s * 0.20, s * 0.27), (s * 0.33, s * 0.27),
        (s * 0.50, s * 0.57), (s * 0.67, s * 0.27),
        (s * 0.80, s * 0.27), (s * 0.50, s * 0.75),
    ]
    d.polygon([(int(x), int(y)) for x, y in pts], fill=(255, 255, 255, 235))
    return img


def tray_image(active: bool) -> Image.Image:
    key = "a" if active else "i"
    if key not in _cache:
        _cache[key] = _make_v(active)
    return _cache[key]


def app_icon_image() -> Image.Image:
    if "app" not in _cache:
        _cache["app"] = _make_v(True)
    return _cache["app"]
