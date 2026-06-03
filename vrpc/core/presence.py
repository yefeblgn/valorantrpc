"""GameState -> Discord presence sözlüğü (dile duyarlı)."""

from __future__ import annotations

from ..constants import FALLBACK_LARGE_IMAGE, GITHUB_URL
from ..i18n import t
from ..riot.content import Content
from .state import GameState


def _level_text(state: GameState, language: str) -> str:
    return f"{t(language, 'level')} {state.account_level}"


def build(
    state: GameState,
    settings,
    content: Content,
    language: str,
    start_ts: int,
) -> dict | None:
    """Aktif duruma göre Discord presence sözlüğü üret (idle ise None)."""
    if state.session_state == "idle":
        return None

    if state.session_state == "ingame":
        presence = _ingame(state, settings, content, language)
    elif state.session_state == "pregame":
        presence = _pregame(state, settings, content, language)
    else:
        presence = _menu(state, settings, content, language)

    # Parti
    if settings.show_party and state.party_size > 0:
        presence["party_size"] = [state.party_size, state.party_max]

    # Geçen süre
    if settings.show_elapsed:
        presence["start"] = start_ts

    presence["buttons"] = [{"label": t(language, "github"), "url": GITHUB_URL}]
    return presence


def _large_card(state: GameState, content: Content, language: str) -> tuple[str, str]:
    card = content.card_wide(state.card_id) or FALLBACK_LARGE_IMAGE
    text = _level_text(state, language) if state.account_level else t(language, "app_title")
    return card, text


def _rank_small(state: GameState, settings, content: Content) -> tuple[str | None, str]:
    """Rekabetçi tier için (icon, metin)."""
    icon = content.tier_icon(state.competitive_tier)
    name = content.tier_name(state.competitive_tier)
    rr = state.rr
    if rr is not None and name:
        return icon, f"{name} · {rr} RR"
    return icon, name


def _menu(state: GameState, settings, content: Content, language: str) -> dict:
    large_image, large_text = _large_card(state, content, language)
    details = content.mode_name(state.queue_id) if state.queue_id else t(language, "p_in_menu")

    presence = {
        "details": details,
        "large_image": large_image,
        "large_text": large_text,
    }

    is_comp = "competitive" in (state.queue_id or "").lower()
    if is_comp and settings.show_rank and state.competitive_tier > 0:
        icon, text = _rank_small(state, settings, content)
        if icon:
            presence["small_image"] = icon
            presence["small_text"] = text
    else:
        icon = content.mode_icon(state.queue_id)
        if icon:
            presence["small_image"] = icon
            presence["small_text"] = content.mode_name(state.queue_id)
    return presence


def _pregame(state: GameState, settings, content: Content, language: str) -> dict:
    map_name, splash = content.map_info(state.map_path)
    if splash:
        large_image, large_text = splash, map_name
    else:
        large_image, large_text = _large_card(state, content, language)

    presence = {
        "details": t(language, "p_selecting_agent"),
        "large_image": large_image,
        "large_text": large_text,
    }

    agent_icon = content.agent_icon(state.agent_uuid)
    agent_name = content.agent_name(state.agent_uuid)
    if agent_icon and agent_name:
        presence["small_image"] = agent_icon
        presence["small_text"] = agent_name
    else:
        icon = content.tier_icon(state.competitive_tier or 0)
        if icon:
            presence["small_image"] = icon
            presence["small_text"] = t(language, "p_pregame_small")
    return presence


def _ingame(state: GameState, settings, content: Content, language: str) -> dict:
    map_name, splash = content.map_info(state.map_path)
    if splash:
        large_image, large_text = splash, map_name
    else:
        large_image, large_text = _large_card(state, content, language)

    mode = content.mode_name(state.queue_id)
    if state.ally_score is not None and state.enemy_score is not None:
        details = f"{mode} · {state.ally_score} - {state.enemy_score}"
    else:
        details = mode

    presence = {
        "details": details,
        "large_image": large_image,
        "large_text": large_text,
    }

    agent_icon = content.agent_icon(state.agent_uuid)
    agent_name = content.agent_name(state.agent_uuid)
    if agent_icon and agent_name:
        presence["small_image"] = agent_icon
        presence["small_text"] = agent_name
    return presence
