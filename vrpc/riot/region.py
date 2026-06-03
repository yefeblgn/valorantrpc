"""Bölge/shard ve dil (locale) otomatik tespiti.

Bölge/shard öncelikle VALORANT log dosyasındaki GLZ/PD URL'lerinden okunur; bulunamazsa
yerel chat oturumundaki bölge bilgisinden tahmin edilir. Dil, Riot Client locale'inden alınır.
"""

from __future__ import annotations

import logging
import re

from ..constants import valorant_log_path
from .local_auth import LocalAuth

logger = logging.getLogger(__name__)

# Chat oturumu bölgesinden shard'a kaba eşleme (log bulunamazsa yedek).
_REGION_TO_SHARD = {
    "na": "na", "latam": "na", "br": "na",
    "eu": "eu",
    "ap": "ap",
    "kr": "kr",
    "pbe": "pbe",
}

_GLZ_RE = re.compile(r"glz-([\w-]+?)-1\.([\w-]+)\.a\.pvp\.net")
_PD_RE = re.compile(r"https://pd\.([\w-]+)\.a\.pvp\.net")


def detect_region_shard(auth: LocalAuth) -> tuple[str, str]:
    """(region, shard) döndür. Tespit edilemezse ('eu', 'eu') varsayılanına düşer."""
    # 1) Log dosyası (en güvenilir).
    try:
        log = valorant_log_path()
        if log.exists():
            txt = log.read_text(encoding="utf-8", errors="ignore")
            m = _GLZ_RE.search(txt)
            if m:
                region, shard = m.group(1), m.group(2)
                logger.debug("Bölge log'dan: region=%s shard=%s", region, shard)
                return region, shard
            mpd = _PD_RE.search(txt)
            if mpd:
                shard = mpd.group(1)
                return shard, shard
    except Exception as e:
        logger.debug("Log'dan bölge okunamadı: %s", e)

    # 2) Yerel chat oturumu.
    try:
        r = auth.local_get("/chat/v1/session")
        if r.status_code == 200:
            region = (r.json().get("region") or "").lower()
            region = region.replace("1", "")  # "na1" -> "na"
            if region:
                shard = _REGION_TO_SHARD.get(region, region)
                logger.debug("Bölge chat'ten: region=%s shard=%s", region, shard)
                return region, shard
    except Exception as e:
        logger.debug("Chat oturumundan bölge okunamadı: %s", e)

    logger.warning("Bölge tespit edilemedi, varsayılan 'eu' kullanılıyor")
    return "eu", "eu"


def detect_locale(auth: LocalAuth) -> str:
    """Riot Client diline göre 'tr' veya 'en' döndür."""
    try:
        r = auth.local_get("/riotclient/region-locale")
        if r.status_code == 200:
            locale = (r.json().get("locale") or "").lower()
            if locale.startswith("tr"):
                return "tr"
    except Exception as e:
        logger.debug("Locale okunamadı: %s", e)
    return "en"


def detect_player(auth: LocalAuth) -> tuple[str, str]:
    """Yerel chat oturumundan (game_name, game_tag) döndür."""
    try:
        r = auth.local_get("/chat/v1/session")
        if r.status_code == 200:
            data = r.json()
            return data.get("game_name", ""), data.get("game_tag", "")
    except Exception as e:
        logger.debug("Oyuncu adı okunamadı: %s", e)
    return "", ""
