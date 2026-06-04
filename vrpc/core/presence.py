from __future__ import annotations

from ..constants import FALLBACK_LARGE_IMAGE, GITHUB_URL
from ..i18n import t
from ..riot.content import Content
from .state import GameState


def _level_text(state: GameState, language: str) -> str:
    return f"{t(language, 'level')} {state.account_level}"


def build(state: GameState, settings, content: Content, language: str, start_ts: int) -> dict | None:
    if state.session_state == "idle":
        return None

    if state.session_state == "ingame":
        presence = _ingame(state, settings, content, language)
    elif state.session_state == "pregame":
        presence = _pregame(state, settings, content, language)
    else:
        presence = _menu(state, settings, content, language)

    presence["large_text"] = "by yefeblgn"

    if settings.show_elapsed:
        presence["start"] = start_ts

    # "Lobiye Katıl" daveti — Discord '+' menüsünden kanala gönderilebilir.
    # join secret + party (içinde yer olacak şekilde: current < max) gerekir.
    # Discord secret + buttons'ı AYNI ANDA kabul etmediği için davet aktifken
    # GitHub butonu gönderilmez (ikisi birlikte tüm RPC'yi kırar).
    if state.card_id:
        cur = state.party_size if state.party_size > 0 else 1
        mx = state.party_max if state.party_max > cur else cur + 1
        presence["party_id"] = f"vrpc_{state.card_id}"
        presence["party_size"] = [cur, mx]
        presence["join"] = f"vrpc_join_{state.card_id}"
    else:
        if settings.show_party and state.party_size > 0:
            presence["party_size"] = [state.party_size, state.party_max]
        presence["buttons"] = [{"label": t(language, "github"), "url": GITHUB_URL}]

    return presence


def _large_card(state: GameState, content: Content, language: str) -> tuple[str, str]:
    text = _level_text(state, language) if state.account_level else t(language, "app_title")
    return FALLBACK_LARGE_IMAGE, text


def _rank_small(state: GameState, settings, content: Content) -> tuple[str | None, str]:
    icon = content.tier_icon(state.competitive_tier)
    name = content.tier_name(state.competitive_tier)
    rr = state.rr
    if rr is not None and name:
        return icon, f"{name} · {rr} RR"
    return icon, name


def _menu(state: GameState, settings, content: Content, language: str) -> dict:
    large_image, large_text = _large_card(state, content, language)
    details = content.mode_name(state.queue_id) if state.queue_id else t(language, "p_in_menu")

    presence = {"details": details, "large_image": large_image, "large_text": large_text}

    if state.is_queuing:
        presence["state"] = t(language, "queuing")

    _RANK_MODES = {"competitive", "unrated", "premier"}
    mode_key = content._queue_key(state.queue_id)

    if settings.show_rank and state.competitive_tier > 0:
        icon, text = _rank_small(state, settings, content)
        if icon:
            presence["small_image"] = icon
            presence["small_text"] = text
    elif mode_key in _RANK_MODES:
        # Kompakt rank rozeti: tier>0 → rank ikonu, tier==0 → Derecesiz rozeti
        tier = state.competitive_tier if state.competitive_tier > 0 else 0
        icon = content.tier_icon(tier)
        if icon:
            presence["small_image"] = icon
            presence["small_text"] = content.mode_name(state.queue_id)
    elif state.card_id:
        card_sq = content.card_square(state.card_id)
        if card_sq:
            presence["small_image"] = card_sq
            presence["small_text"] = f"{state.name}#{state.tag}" if state.name else ""
    else:
        icon = content.mode_icon_unique(state.queue_id)
        if icon:
            presence["small_image"] = icon
            presence["small_text"] = content.mode_name(state.queue_id)
    return presence


def _pregame(state: GameState, settings, content: Content, language: str) -> dict:
    map_name, splash = content.map_info(state.map_path)
    large_image, large_text = (splash, map_name) if splash else _large_card(state, content, language)

    presence = {"details": t(language, "p_selecting_agent"), "large_image": large_image, "large_text": large_text}

    agent_icon = content.agent_icon(state.agent_uuid)
    agent_name = content.agent_name(state.agent_uuid)
    if agent_icon:
        presence["small_image"] = agent_icon
        presence["small_text"] = agent_name or ""
        if agent_name:
            presence["state"] = agent_name
    else:
        icon = content.tier_icon(state.competitive_tier or 0)
        if icon:
            presence["small_image"] = icon
            presence["small_text"] = t(language, "p_pregame_small")
    return presence


def _ingame(state: GameState, settings, content: Content, language: str) -> dict:
    map_name, splash = content.map_info(state.map_path)
    large_image, large_text = (splash, map_name) if splash else _large_card(state, content, language)

    details = content.mode_name(state.queue_id)

    if state.ally_score is not None and state.enemy_score is not None:
        state_line = f"{t(language, 'p_in_game')} · {state.ally_score} - {state.enemy_score}"
    else:
        state_line = t(language, "p_in_game")

    presence = {
        "details": details,
        "state":   state_line,
        "large_image": large_image,
        "large_text":  large_text,
    }

    agent_icon = content.agent_icon(state.agent_uuid)
    agent_name = content.agent_name(state.agent_uuid)
    if agent_icon:
        presence["small_image"] = agent_icon
        presence["small_text"]  = agent_name or content.mode_name(state.queue_id)
    else:
        icon = content.mode_icon_unique(state.queue_id)
        if icon:
            presence["small_image"] = icon
            presence["small_text"]  = content.mode_name(state.queue_id)
    return presence
