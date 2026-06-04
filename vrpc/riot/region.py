from __future__ import annotations

import logging
import re

from ..constants import valorant_log_path
from .local_auth import LocalAuth

logger = logging.getLogger(__name__)

_REGION_TO_SHARD = {
    "na": "na", "latam": "na", "br": "na",
    "eu": "eu", "ap": "ap", "kr": "kr", "pbe": "pbe",
}

_GLZ_RE = re.compile(r"glz-([\w-]+?)-1\.([\w-]+)\.a\.pvp\.net")
_PD_RE = re.compile(r"https://pd\.([\w-]+)\.a\.pvp\.net")


def detect_region_shard(auth: LocalAuth) -> tuple[str, str]:
    try:
        log = valorant_log_path()
        if log.exists():
            txt = log.read_text(encoding="utf-8", errors="ignore")
            m = _GLZ_RE.search(txt)
            if m:
                return m.group(1), m.group(2)
            mpd = _PD_RE.search(txt)
            if mpd:
                shard = mpd.group(1)
                return shard, shard
    except Exception as e:
        logger.debug("Region from log failed: %s", e)

    try:
        r = auth.local_get("/chat/v1/session")
        if r.status_code == 200:
            region = (r.json().get("region") or "").lower().replace("1", "")
            if region:
                return region, _REGION_TO_SHARD.get(region, region)
    except Exception as e:
        logger.debug("Region from chat failed: %s", e)

    logger.warning("Region detection failed, defaulting to 'eu'")
    return "eu", "eu"


def detect_locale(auth: LocalAuth) -> str:
    try:
        r = auth.local_get("/riotclient/region-locale")
        if r.status_code == 200:
            locale = (r.json().get("locale") or "").lower()
            if locale.startswith("tr"):
                return "tr"
    except Exception as e:
        logger.debug("Locale detection failed: %s", e)
    return "en"


def detect_player(auth: LocalAuth) -> tuple[str, str]:
    try:
        r = auth.local_get("/chat/v1/session")
        if r.status_code == 200:
            data = r.json()
            return data.get("game_name", ""), data.get("game_tag", "")
    except Exception as e:
        logger.debug("Player detection failed: %s", e)
    return "", ""
