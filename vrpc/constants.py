from __future__ import annotations

import os
import sys
from pathlib import Path


def resource_path(*parts: str) -> Path:
    base = getattr(sys, "_MEIPASS", None)
    if base:
        return Path(base).joinpath(*parts)
    return Path(__file__).resolve().parent.parent.joinpath(*parts)


DISCORD_CLIENT_ID = "1434340968487850135"
GITHUB_URL = "https://github.com/yefeblgn/valorantrpc"
VALORANT_API = "https://valorant-api.com/v1"

CLIENT_PLATFORM = (
    "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3Mi"
    "LA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwN"
    "CgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9"
)

FALLBACK_CLIENT_VERSION = "release-09.00-shipping-9-0000000"
APP_NAME = "ValorantRPC"
FALLBACK_LARGE_IMAGE = "valorant_logo"
POLL_INTERVAL = 2.0


def app_data_dir() -> Path:
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
