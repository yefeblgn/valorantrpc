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

    def signature(self) -> tuple:
        return (
            self.session_state, self.queue_id, self.map_path, self.agent_uuid,
            self.party_size, self.party_max, self.competitive_tier, self.rr,
            self.ally_score, self.enemy_score, self.party_state,
        )

    @property
    def is_queuing(self) -> bool:
        return self.session_state == "menus" and self.party_state.upper() == "MATCHMAKING"

    @property
    def is_custom(self) -> bool:
        return "custom" in (self.provisioning_flow or "").lower() or (
            self.queue_id or ""
        ).lower() == "custom"


def parse_presence(private: dict) -> GameState:
    """Çözülmüş private presence'ı GameState'e dönüştür.

    Riot 12.x ile alanları iç içe objelere taşıdı (matchPresenceData,
    partyPresenceData, playerPresenceData). Hem yeni nested hem eski flat
    yapıyı destekler.
    """
    state = GameState()
    if not private:
        return state

    match_d = private.get("matchPresenceData") or {}
    party_d = private.get("partyPresenceData") or {}
    player_d = private.get("playerPresenceData") or {}

    def pick(key, *sources):
        for s in sources:
            v = s.get(key)
            if v is not None:
                return v
        return None

    loop = (pick("sessionLoopState", match_d, private) or "").upper()
    state.session_state = {"MENUS": "menus", "PREGAME": "pregame", "INGAME": "ingame"}.get(loop, "menus")
    state.queue_id = pick("queueId", match_d, private) or ""
    state.provisioning_flow = pick("provisioningFlow", match_d, private) or ""
    state.map_path = pick("matchMap", match_d, private) or ""
    state.party_size = int(pick("partySize", private, party_d) or 0)
    state.party_max = int(pick("maxPartySize", private, party_d) or 5)
    state.competitive_tier = int(pick("competitiveTier", player_d, private) or 0)
    state.account_level = int(pick("accountLevel", player_d, private) or 0)
    state.card_id = pick("playerCardId", player_d, private) or ""
    state.agent_uuid = pick("characterId", player_d, private) or ""
    state.is_idle = bool(private.get("isIdle", False))
    state.party_state = pick("partyState", party_d, private) or ""
    state.queue_entry_time = pick("queueEntryTime", party_d, private) or ""

    ally = pick("partyOwnerMatchScoreAllyTeam", private, party_d)
    enemy = pick("partyOwnerMatchScoreEnemyTeam", private, party_d)
    if ally is not None:
        state.ally_score = int(ally)
    if enemy is not None:
        state.enemy_score = int(enemy)

    return state
