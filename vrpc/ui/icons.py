"""İkon/görsel yükleme yardımcıları (tray + panel)."""

from __future__ import annotations

import logging

from PIL import Image

from ..constants import resource_path

logger = logging.getLogger(__name__)

_cache: dict[str, Image.Image] = {}


def _load(name: str) -> Image.Image | None:
    if name in _cache:
        return _cache[name]
    try:
        img = Image.open(resource_path("assets", name)).convert("RGBA")
        _cache[name] = img
        return img
    except Exception as e:
        logger.debug("İkon yüklenemedi (%s): %s", name, e)
        return None


def tray_image(active: bool) -> Image.Image:
    """Tray ikon görseli: aktif (oyun açık) / pasif (idle)."""
    img = _load("game_icon.png" if active else "game_icon_idle.png")
    if img is None:
        # Son çare: düz renkli kare.
        img = Image.new("RGBA", (64, 64), (255, 70, 85, 255) if active else (90, 90, 90, 255))
    return img


def app_ico_path() -> str | None:
    p = resource_path("assets", "game_icon_white.ico")
    return str(p) if p.exists() else None
