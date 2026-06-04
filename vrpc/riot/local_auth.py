from __future__ import annotations

import logging
import warnings

import requests
import urllib3

from ..constants import (
    CLIENT_PLATFORM,
    FALLBACK_CLIENT_VERSION,
    VALORANT_API,
    riot_lockfile_path,
)

warnings.simplefilter("ignore", urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)


class RiotNotRunning(Exception):
    pass


def read_lockfile() -> dict:
    path = riot_lockfile_path()
    if not path.exists():
        raise RiotNotRunning("lockfile not found")
    try:
        parts = path.read_text(encoding="utf-8").strip().split(":")
        name, pid, port, password, protocol = parts
        return {"name": name, "pid": pid, "port": port, "password": password, "protocol": protocol}
    except Exception as e:
        raise RiotNotRunning(f"lockfile read error: {e}") from e


class LocalAuth:
    def __init__(self) -> None:
        self.session = requests.Session()
        self.session.verify = False
        self.port: str | None = None
        self.password: str | None = None
        self.protocol: str = "https"
        self.access_token: str | None = None
        self.entitlement_token: str | None = None
        self.puuid: str | None = None
        self.client_version: str | None = None

    @property
    def local_base(self) -> str:
        return f"{self.protocol}://127.0.0.1:{self.port}"

    @property
    def local_auth(self) -> tuple[str, str]:
        return ("riot", self.password or "")

    def local_get(self, path: str, timeout: float = 5.0) -> requests.Response:
        return self.session.get(self.local_base + path, auth=self.local_auth, timeout=timeout)

    def refresh(self) -> bool:
        lock = read_lockfile()
        self.port = lock["port"]
        self.password = lock["password"]
        self.protocol = lock["protocol"]

        try:
            r = self.local_get("/entitlements/v1/token")
        except requests.exceptions.RequestException as e:
            raise RiotNotRunning(f"local API unreachable: {e}") from e

        if r.status_code != 200:
            raise RiotNotRunning(f"entitlements HTTP {r.status_code}")

        data = r.json()
        self.access_token = data.get("accessToken")
        self.entitlement_token = data.get("token")
        self.puuid = data.get("subject")
        if not (self.access_token and self.entitlement_token and self.puuid):
            raise RiotNotRunning("incomplete entitlements response")

        if not self.client_version:
            self.client_version = self._fetch_client_version()
        return True

    def _fetch_client_version(self) -> str:
        try:
            r = requests.get(f"{VALORANT_API}/version", timeout=5)
            if r.status_code == 200:
                return r.json()["data"]["riotClientVersion"]
        except Exception as e:
            logger.debug("ClientVersion fetch failed: %s", e)
        return FALLBACK_CLIENT_VERSION

    def pd_glz_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "X-Riot-Entitlements-JWT": self.entitlement_token or "",
            "X-Riot-ClientPlatform": CLIENT_PLATFORM,
            "X-Riot-ClientVersion": self.client_version or FALLBACK_CLIENT_VERSION,
        }

    def is_valid(self) -> bool:
        return bool(self.access_token and self.entitlement_token and self.puuid)
