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

    def current_agent(self, session_state: str) -> str | None:
        info = self.current_ingame_info(session_state)
        return info.get("agent") if info else None

    def current_ingame_info(self, session_state: str) -> dict | None:
        try:
            if session_state == "ingame":
                return self._coregame_info()
            if session_state == "pregame":
                agent = self._pregame_agent()
                return {"agent": agent, "kills": 0, "deaths": 0, "assists": 0} if agent else None
        except Exception as e:
            logger.debug("current_ingame_info error: %s", e)
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
            return None
        for player in rm.json().get("Players", []):
            if player.get("Subject") == self.auth.puuid:
                stats = player.get("Stats") or {}
                return {
                    "agent":   player.get("CharacterID") or None,
                    "kills":   int(stats.get("Kills",   0)),
                    "deaths":  int(stats.get("Deaths",  0)),
                    "assists": int(stats.get("Assists", 0)),
                }
        return None

    def _pregame_agent(self) -> str | None:
        r = self._remote_get(f"{self.glz}/pregame/v1/players/{self.auth.puuid}")
        if r.status_code != 200:
            return None
        match_id = r.json().get("MatchID")
        if not match_id:
            return None
        rm = self._remote_get(f"{self.glz}/pregame/v1/matches/{match_id}")
        if rm.status_code != 200:
            return None
        data = rm.json()
        teams = data.get("Teams") or []
        ally = data.get("AllyTeam")
        if ally:
            teams = teams + [ally]
        for team in teams:
            for player in team.get("Players", []):
                if player.get("Subject") == self.auth.puuid:
                    return player.get("CharacterID") or None
        return None

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
