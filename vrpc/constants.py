"""Uygulama geneli sabitler."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def resource_path(*parts: str) -> Path:
    """Geliştirme ve PyInstaller (onefile) ortamlarında paketlenmiş dosya yolu."""
    base = getattr(sys, "_MEIPASS", None)
    if base:
        return Path(base).joinpath(*parts)
    # vrpc/ paketinin bir üstü = depo kökü (assets burada).
    return Path(__file__).resolve().parent.parent.joinpath(*parts)

# --- Discord ---
# Discord Developer Portal uygulamasının Client ID'si (değiştirmeyin).
DISCORD_CLIENT_ID = "1434340968487850135"

# Presence'taki butonun yönlendirdiği depo.
GITHUB_URL = "https://github.com/yefeblgn/valorantrpc"

# --- valorant-api.com (anahtarsız statik içerik CDN'i, Henrik DEĞİL) ---
VALORANT_API = "https://valorant-api.com/v1"

# Riot yerel/uzak uçları için sabit istemci platformu (base64).
# {"platformType":"PC","platformOS":"Windows","platformOSVersion":"10.0.19042.1.256.64bit","platformChipset":"Unknown"}
CLIENT_PLATFORM = (
    "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3Mi"
    "LA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwN"
    "CgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9"
)

# ClientVersion alınamazsa kullanılacak makul bir varsayılan.
FALLBACK_CLIENT_VERSION = "release-09.00-shipping-9-0000000"

# --- Yollar ---
APP_NAME = "ValorantRPC"


def app_data_dir() -> Path:
    """Ayar/cache dosyaları için %LOCALAPPDATA%\\ValorantRPC dizini."""
    base = os.environ.get("LOCALAPPDATA") or str(Path.home())
    path = Path(base) / APP_NAME
    path.mkdir(parents=True, exist_ok=True)
    return path


def riot_lockfile_path() -> Path:
    base = os.environ.get("LOCALAPPDATA") or str(Path.home())
    return Path(base) / "Riot Games" / "Riot Client" / "Config" / "lockfile"


def valorant_log_path() -> Path:
    base = os.environ.get("LOCALAPPDATA") or str(Path.home())
    return Path(base) / "VALORANT" / "Saved" / "Logs" / "ShooterGame.log"


# Discord uygulamasına yüklenmiş yedek (fallback) büyük görsel anahtarı.
FALLBACK_LARGE_IMAGE = "valorant_logo"

# Poller döngü aralığı (saniye).
POLL_INTERVAL = 2.0
