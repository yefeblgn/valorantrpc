from __future__ import annotations

import base64
import json
import logging

import requests

from .local_auth import LocalAuth

logger = logging.getLogger(__name__)


class RiotApi:
    def __init__(self, auth: LocalAuth, region: str, shard: str) -> None:
        self.auth = auth
        self.region = region
        self.shard = shard

    @property
    def pd(self) -> str:
        return f"https://pd.{self.shard}.a.pvp.net"

    @property
    def glz(self) -> str:
        return f"https://glz-{self.region}-1.{self.shard}.a.pvp.net"

    def _remote_get(self, url: str, timeout: float = 6.0):
        return self.auth.session.get(url, headers=self.auth.pd_glz_headers(), timeout=timeout)

    def _remote_post(self, url: str, data=None, timeout: float = 6.0):
        return self.auth.session.post(url, json=data, headers=self.auth.pd_glz_headers(), timeout=timeout)

    def select_agent(self, match_id: str, agent_uuid: str) -> bool:
        url = f"{self.glz}/pregame/v1/matches/{match_id}/select/{agent_uuid}"
        try:
            r = self._remote_post(url)
            return r.status_code == 200
        except Exception as e:
            logger.debug("select_agent error: %s", e)
            return False

    def lock_agent(self, match_id: str, agent_uuid: str) -> bool:
        url = f"{self.glz}/pregame/v1/matches/{match_id}/lock/{agent_uuid}"
        try:
            r = self._remote_post(url)
            return r.status_code == 200
        except Exception as e:
            logger.debug("lock_agent error: %s", e)
            return False

    def self_presence(self) -> dict | None:
        try:
            r = self.auth.local_get("/chat/v4/presences")
            if r.status_code != 200:
                return None
            for p in r.json().get("presences", []):
                if p.get("puuid") == self.auth.puuid and p.get("product") == "valorant":
                    priv = p.get("private")
                    if not priv:
                        return {}
                    decoded = base64.b64decode(priv).decode("utf-8", "ignore")
                    return json.loads(decoded)
        except Exception as e:
            logger.debug("self_presence error: %s", e)
        return None

    def match_phase(self) -> dict | None:
        """GLZ uçlarını sorgulayarak gerçek oyun fazını belirle.

        Döner: {"phase": "ingame"|"pregame", "agent": uuid|None} veya None (maçta değil).
        Presence'ın sessionLoopState'i gecikebildiği için bu kaynak daha güvenilir.
        """
        try:
            info = self._coregame_info()
            if info is not None:
                info["phase"] = "ingame"
                return info
        except Exception as e:
            logger.debug("coregame error: %s", e)
        try:
            info = self._pregame_info()
            if info is not None:
                info["phase"] = "pregame"
                return info
        except Exception as e:
            logger.debug("pregame error: %s", e)
        return None

    def _coregame_info(self) -> dict | None:
        r = self._remote_get(f"{self.glz}/core-game/v1/players/{self.auth.puuid}")
        if r.status_code != 200:
            return None
        match_id = r.json().get("MatchID")
        if not match_id:
            return None
        rm = self._remote_get(f"{self.glz}/core-game/v1/matches/{match_id}")
        if rm.status_code != 200:
            return {"agent": None}
        for player in rm.json().get("Players", []):
            if player.get("Subject") == self.auth.puuid:
                return {"agent": player.get("CharacterID") or None}
        return {"agent": None}

    def _pregame_info(self) -> dict | None:
        r = self._remote_get(f"{self.glz}/pregame/v1/players/{self.auth.puuid}")
        if r.status_code != 200:
            return None
        match_id = r.json().get("MatchID")
        if not match_id:
            return None
        rm = self._remote_get(f"{self.glz}/pregame/v1/matches/{match_id}")
        if rm.status_code != 200:
            return {"agent": None}
        data = rm.json()
        teams = data.get("Teams") or []
        ally = data.get("AllyTeam")
        if ally:
            teams = teams + [ally]
        agent_id = None
        for team in teams:
            for player in team.get("Players", []):
                if player.get("Subject") == self.auth.puuid:
                    agent_id = player.get("CharacterID") or None
                    break
        return {
            "agent": agent_id,
            "match_id": match_id,
            "queue_id": data.get("QueueID", ""),
            "provisioning_flow": data.get("ProvisioningFlowID", ""),
        }

    def mmr(self) -> tuple[int, int] | None:
        try:
            r = self._remote_get(f"{self.pd}/mmr/v1/players/{self.auth.puuid}")
            if r.status_code != 200:
                return None
            data = r.json()

            latest = data.get("LatestCompetitiveUpdate") or {}
            tier = latest.get("TierAfterUpdate")
            rr = latest.get("RankedRatingAfterUpdate")
            if tier:
                return int(tier), int(rr or 0)

            seasonal = (
                data.get("QueueSkills", {})
                .get("competitive", {})
                .get("SeasonalInfoBySeasonID", {})
            )
            best = None
            for info in seasonal.values():
                if info.get("CompetitiveTier"):
                    if best is None or info.get("NumberOfGames", 0) >= best.get("NumberOfGames", 0):
                        best = info
            if best:
                return int(best.get("CompetitiveTier", 0)), int(best.get("RankedRating", 0))
        except Exception as e:
            logger.debug("mmr error: %s", e)
        return None
