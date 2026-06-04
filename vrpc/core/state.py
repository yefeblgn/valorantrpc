from __future__ import annotations

from dataclasses import dataclass


@dataclass
class GameState:
    session_state: str = "idle"
    queue_id: str = ""
    provisioning_flow: str = ""
    map_path: str = ""
    party_size: int = 0
    party_max: int = 5
    competitive_tier: int = 0
    account_level: int = 0
    card_id: str = ""
    ally_score: int | None = None
    enemy_score: int | None = None
    agent_uuid: str = ""
    rr: int | None = None
    name: str = ""
    tag: str = ""
    is_idle: bool = False
    party_state: str = ""
    queue_entry_time: str = ""
    kills: int = 0
    deaths: int = 0
    assists: int = 0

    def signature(self) -> tuple:
        return (
            self.session_state, self.queue_id, self.map_path, self.agent_uuid,
            self.party_size, self.party_max, self.competitive_tier, self.rr,
            self.ally_score, self.enemy_score, self.party_state,
            self.kills, self.deaths, self.assists,
        )

    @property
    def is_queuing(self) -> bool:
        if self.session_state != "menus":
            return False
        return (self.party_state.upper() == "MATCHMAKING" or
                bool(self.queue_entry_time))

    @property
    def is_custom(self) -> bool:
        return "custom" in (self.provisioning_flow or "").lower() or (
            self.queue_id or ""
        ).lower() == "custom"


def parse_presence(private: dict) -> GameState:
    state = GameState()
    if not private:
        return state

    loop = (private.get("sessionLoopState") or "").upper()
    state.session_state = {"MENUS": "menus", "PREGAME": "pregame", "INGAME": "ingame"}.get(loop, "menus")
    state.queue_id = private.get("queueId", "") or ""
    state.provisioning_flow = private.get("provisioningFlow", "") or ""
    state.map_path = private.get("matchMap", "") or ""
    state.party_size = int(private.get("partySize", 0) or 0)
    state.party_max = int(private.get("maxPartySize", 5) or 5)
    state.competitive_tier = int(private.get("competitiveTier", 0) or 0)
    state.account_level = int(private.get("accountLevel", 0) or 0)
    state.card_id = private.get("playerCardId", "") or ""
    state.is_idle = bool(private.get("isIdle", False))
    state.party_state = private.get("partyState", "") or ""
    state.queue_entry_time = private.get("queueEntryTime", "") or ""

    if state.session_state == "ingame" and not state.is_custom:
        ally = private.get("partyOwnerMatchScoreAllyTeam")
        enemy = private.get("partyOwnerMatchScoreEnemyTeam")
        if ally is not None:
            state.ally_score = int(ally)
        if enemy is not None:
            state.enemy_score = int(enemy)

    return state
