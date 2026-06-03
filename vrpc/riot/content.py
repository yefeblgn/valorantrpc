"""valorant-api.com üzerinden yerelleştirilmiş içerik (isim) + statik medya URL'leri.

- İsimler (ajan/harita/rank) valorant-api'den dile göre çekilir ve diske cache'lenir.
- İkon/görsel URL'leri media.valorant-api.com statik CDN deseniyle doğrudan üretilir
  (ek istek gerekmez).

valorant-api ANAHTARSIZ ve statiktir; HenrikDev ile ilgisi yoktur.
"""

from __future__ import annotations

import json
import logging
import time

import requests

from ..constants import VALORANT_API, app_data_dir
from ..i18n import api_language

logger = logging.getLogger(__name__)

MEDIA = "https://media.valorant-api.com"
CACHE_DIR = app_data_dir() / "cache"
CACHE_TTL = 24 * 3600  # 24 saat

# queueId -> oyun modu UUID (ikon için, stabil) ve yerelleştirilmiş isim.
_MODE_UUID = {
    "competitive": "96bd3920-4f36-d026-2b28-c683eb0bcac5",
    "unrated": "96bd3920-4f36-d026-2b28-c683eb0bcac5",
    "swiftplay": "5d0f264b-4ebe-cc63-c147-809e1374484b",
    "spikerush": "e921d1e6-416b-c31f-1291-74930c330b7b",
    "deathmatch": "a8790ec5-4237-f2f0-e93b-08a8e89865b2",
    "ggteam": "a4ed6518-4741-6dcb-35bd-f884aecdc859",
    "hurm": "e086db66-47fd-e791-ca81-06a645ac7661",
    "onefa": "4744698a-4513-dc96-9c22-a9aa437e4a58",
    "snowball": "57038d6d-49b1-3a74-c5ef-3395d9f23a97",
    "newmap": "96bd3920-4f36-d026-2b28-c683eb0bcac5",
}

_MODE_NAME = {
    "competitive": {"tr": "Rekabetçi", "en": "Competitive"},
    "unrated": {"tr": "Derecesiz", "en": "Unrated"},
    "swiftplay": {"tr": "Tam Gaz", "en": "Swiftplay"},
    "spikerush": {"tr": "Spike Hücum", "en": "Spike Rush"},
    "deathmatch": {"tr": "Ölüm Maçı", "en": "Deathmatch"},
    "ggteam": {"tr": "Tırmanış", "en": "Escalation"},
    "hurm": {"tr": "Takımlı Ölüm Maçı", "en": "Team Deathmatch"},
    "onefa": {"tr": "Kopyalama", "en": "Replication"},
    "snowball": {"tr": "Kartopu Savaşı", "en": "Snowball Fight"},
    "newmap": {"tr": "Yeni Harita", "en": "New Map"},
    "custom": {"tr": "Özel Oyun", "en": "Custom Game"},
    "": {"tr": "Lobide", "en": "In Lobby"},
}


class Content:
    """Dile bağlı içerik sözlükleri; tembel yüklenir, diske cache'lenir."""

    def __init__(self, language: str = "en") -> None:
        self.language = language
        self._agents: dict[str, str] | None = None       # uuid -> isim
        self._maps: dict[str, dict] | None = None         # mapUrl(lower) -> {name, uuid}
        self._tiers: dict[int, dict] | None = None        # tier -> {name, icon}

    def set_language(self, language: str) -> None:
        if language != self.language:
            self.language = language
            self._agents = self._maps = self._tiers = None

    # ---- cache yardımcıları ----
    def _cache_file(self, name: str):
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        return CACHE_DIR / f"{name}_{self.language}.json"

    def _fetch(self, name: str, path: str):
        """API'den çek (cache TTL içindeyse diskten). Başarısızsa None."""
        cf = self._cache_file(name)
        if cf.exists() and (time.time() - cf.stat().st_mtime) < CACHE_TTL:
            try:
                return json.loads(cf.read_text(encoding="utf-8"))
            except Exception:
                pass
        try:
            sep = "&" if "?" in path else "?"
            url = f"{VALORANT_API}{path}{sep}language={api_language(self.language)}"
            r = requests.get(url, timeout=8)
            if r.status_code == 200:
                data = r.json().get("data")
                cf.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
                return data
        except Exception as e:
            logger.debug("İçerik çekilemedi (%s): %s", name, e)
        # Çevrimdışı yedek: süresi geçmiş cache varsa yine de kullan.
        if cf.exists():
            try:
                return json.loads(cf.read_text(encoding="utf-8"))
            except Exception:
                pass
        return None

    # ---- ajanlar ----
    def _ensure_agents(self) -> dict[str, str]:
        if self._agents is None:
            self._agents = {}
            data = self._fetch("agents", "/agents?isPlayableCharacter=true")
            for a in data or []:
                self._agents[a["uuid"].lower()] = a.get("displayName", "")
        return self._agents

    def agent_name(self, uuid: str | None) -> str:
        if not uuid:
            return ""
        return self._ensure_agents().get(uuid.lower(), "")

    def agent_icon(self, uuid: str | None) -> str | None:
        if not uuid:
            return None
        return f"{MEDIA}/agents/{uuid.lower()}/displayicon.png"

    # ---- haritalar ----
    def _ensure_maps(self) -> dict[str, dict]:
        if self._maps is None:
            self._maps = {}
            data = self._fetch("maps", "/maps")
            for m in data or []:
                url = (m.get("mapUrl") or "").lower()
                if url:
                    self._maps[url] = {
                        "name": m.get("displayName", ""),
                        "uuid": m.get("uuid", ""),
                    }
        return self._maps

    def map_info(self, map_path: str | None) -> tuple[str, str | None]:
        """matchMap path'inden (isim, splash_url) döndür."""
        if not map_path:
            return "", None
        entry = self._ensure_maps().get(map_path.lower())
        if not entry:
            return "", None
        splash = (
            f"{MEDIA}/maps/{entry['uuid']}/splash.png" if entry.get("uuid") else None
        )
        return entry.get("name", ""), splash

    # ---- rank tier'leri ----
    def _ensure_tiers(self) -> dict[int, dict]:
        if self._tiers is None:
            self._tiers = {}
            data = self._fetch("competitivetiers", "/competitivetiers")
            if data:
                # En güncel tier tablosu listenin sonundadır.
                latest = data[-1]
                for tinfo in latest.get("tiers", []):
                    self._tiers[int(tinfo["tier"])] = {
                        "name": tinfo.get("tierName", "").title(),
                        "icon": tinfo.get("largeIcon"),
                    }
        return self._tiers

    def tier_name(self, tier: int | None) -> str:
        if not tier:
            return ""
        return self._ensure_tiers().get(int(tier), {}).get("name", "")

    def tier_icon(self, tier: int | None) -> str | None:
        if tier is None:
            return None
        return self._ensure_tiers().get(int(tier), {}).get("icon")

    # ---- oyun modları ----
    def _queue_key(self, queue_id: str | None) -> str:
        q = (queue_id or "").lower()
        for key in _MODE_NAME:
            if key and key in q:
                return key
        return ""

    def mode_name(self, queue_id: str | None) -> str:
        key = self._queue_key(queue_id)
        names = _MODE_NAME.get(key, _MODE_NAME[""])
        return names.get(self.language, names["en"])

    def mode_icon(self, queue_id: str | None) -> str | None:
        key = self._queue_key(queue_id)
        uuid = _MODE_UUID.get(key)
        return f"{MEDIA}/gamemodes/{uuid}/displayicon.png" if uuid else None

    # ---- profil kartı ----
    def card_wide(self, uuid: str | None) -> str | None:
        if not uuid:
            return None
        return f"{MEDIA}/playercards/{uuid}/wideart.png"
