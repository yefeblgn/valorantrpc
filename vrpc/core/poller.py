from __future__ import annotations

import logging
import threading
import time

from ..constants import DISCORD_CLIENT_ID, POLL_INTERVAL
from ..riot.api import RiotApi
from ..riot.content import Content
from ..riot.local_auth import LocalAuth, RiotNotRunning
from ..riot.region import detect_locale, detect_player, detect_region_shard
from . import presence as presence_builder
from .discord_rpc import DiscordRPC
from .state import GameState, parse_presence

logger = logging.getLogger(__name__)

INGAME_REFRESH = 10.0
MMR_REFRESH = 300.0


class Poller:
    def __init__(self, settings, on_update=None) -> None:
        self.settings = settings
        self.on_update = on_update
        self.content = Content(settings.language)
        self.discord = DiscordRPC(DISCORD_CLIENT_ID)
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self._lock = threading.Lock()
        self.state = GameState()
        self.valorant_connected = False
        self.discord_connected = False
        self.player_name = ""
        self.player_tag = ""
        self._auth: LocalAuth | None = None
        self._api: RiotApi | None = None
        self._region = self._shard = ""
        self._start_ts = int(time.time())
        self._last_signature: tuple | None = None
        self._last_ingame_fetch = 0.0
        self._last_mmr_fetch = 0.0
        self._error_streak = 0

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="vrpc-poller", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=3)
        self.discord.close()

    def _notify(self) -> None:
        if self.on_update:
            try:
                self.on_update()
            except Exception:
                pass

    def _set_idle(self) -> None:
        changed = self.valorant_connected or self.state.session_state != "idle"
        with self._lock:
            self.valorant_connected = False
            self.state = GameState(session_state="idle", name=self.player_name, tag=self.player_tag)
        self._last_signature = None
        self._auth = None
        self._api = None
        if self.discord_connected:
            self.discord.clear()
        if changed:
            self._notify()

    def _ensure_connection(self) -> bool:
        if self._auth and self._auth.is_valid():
            return True
        auth = LocalAuth()
        auth.refresh()
        region, shard = detect_region_shard(auth)
        self._auth = auth
        self._region, self._shard = region, shard
        self._api = RiotApi(auth, region, shard)

        if not self.settings.language_detected:
            lang = detect_locale(auth)
            self.settings.language = lang
            self.settings.language_detected = True
            self.settings.save()
            self.content.set_language(lang)

        name, tag = detect_player(auth)
        with self._lock:
            self.player_name, self.player_tag = name or self.player_name, tag or self.player_tag
            self.valorant_connected = True
        logger.info("Riot connected: %s#%s [%s/%s]", name, tag, region, shard)
        return True

    def _run(self) -> None:
        self.discord_connected = self.discord.connect()
        while not self._stop.is_set():
            try:
                self._tick()
                self._error_streak = 0
                self._stop.wait(POLL_INTERVAL)
            except RiotNotRunning:
                self._set_idle()
                self._stop.wait(POLL_INTERVAL * 2)
            except Exception as e:
                self._error_streak += 1
                logger.debug("Poller error (%d): %s", self._error_streak, e)
                backoff = min(POLL_INTERVAL * 2 ** min(self._error_streak, 4), 30)
                self._stop.wait(backoff)

    def _tick(self) -> None:
        if not self.discord.connected:
            self.discord_connected = self.discord.connect()
        else:
            self.discord_connected = True

        self._ensure_connection()
        self.content.set_language(self.settings.language)

        private = self._api_self_presence()
        if private is None:
            return

        state = parse_presence(private)
        state.name = self.player_name
        state.tag = self.player_tag

        now = time.time()

        # Gerçek oyun fazını GLZ uçlarından doğrula (presence gecikebilir).
        # Sadece maça yakınken sorgula: presence pregame/ingame derse ya da
        # bir matchMap atanmışsa. Saf ana menüde gereksiz çağrı yapma.
        near_match = state.session_state in ("ingame", "pregame") or bool(state.map_path)
        if near_match:
            cache_ok = (now - self._last_ingame_fetch) < INGAME_REFRESH
            if cache_ok:
                if self.state.session_state in ("ingame", "pregame"):
                    state.session_state = self.state.session_state
                    state.agent_uuid = self.state.agent_uuid or state.agent_uuid
            else:
                self._last_ingame_fetch = now
                phase = self._api.match_phase()
                if phase:
                    state.session_state = phase["phase"]
                    state.agent_uuid = phase.get("agent") or self.state.agent_uuid
                elif state.session_state in ("ingame", "pregame") and self.state.agent_uuid:
                    state.agent_uuid = self.state.agent_uuid

        if state.competitive_tier > 0:
            if self.state.rr is not None and (now - self._last_mmr_fetch) < MMR_REFRESH:
                state.rr = self.state.rr
            else:
                mmr = self._api.mmr()
                if mmr:
                    tier, rr = mmr
                    state.rr = rr
                    if tier:
                        state.competitive_tier = tier
                    self._last_mmr_fetch = now
                else:
                    state.rr = self.state.rr

        with self._lock:
            self.state = state

        self._push_presence(state)

    def _api_self_presence(self):
        try:
            return self._api.self_presence()
        except Exception as e:
            logger.debug("presence read error: %s", e)
            return None

    def _push_presence(self, state: GameState) -> None:
        sig = (state.signature(), self.settings.rpc_enabled, self.settings.language)
        if sig == self._last_signature:
            return
        self._last_signature = sig

        if not self.settings.rpc_enabled:
            self.discord.clear()
        else:
            data = presence_builder.build(
                state, self.settings, self.content, self.settings.language, self._start_ts
            )
            if data:
                ok = self.discord.update(data)
                self.discord_connected = ok or self.discord.connected
        self._notify()

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "state": self.state,
                "valorant": self.valorant_connected,
                "discord": self.discord_connected,
                "name": self.player_name,
                "tag": self.player_tag,
            }

    def force_refresh(self) -> None:
        self._last_signature = None
