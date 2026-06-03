"""Discord Rich Presence (pypresence) sarmalayıcısı — otomatik yeniden bağlanmalı."""

from __future__ import annotations

import logging

from pypresence import Presence

logger = logging.getLogger(__name__)


class DiscordRPC:
    def __init__(self, client_id: str) -> None:
        self.client_id = client_id
        self.rpc: Presence | None = None
        self.connected = False

    def connect(self) -> bool:
        try:
            self.rpc = Presence(self.client_id)
            self.rpc.connect()
            self.connected = True
            logger.info("Discord RPC bağlandı")
            return True
        except Exception as e:
            logger.debug("Discord RPC bağlanamadı: %s", e)
            self.connected = False
            return False

    def update(self, presence: dict) -> bool:
        if not self.connected:
            if not self.connect():
                return False
        try:
            clean = {k: v for k, v in presence.items() if v is not None}
            self.rpc.update(**clean)
            return True
        except Exception as e:
            logger.debug("Presence güncellenemedi: %s", e)
            self.connected = False
            return False

    def clear(self) -> None:
        if self.connected and self.rpc:
            try:
                self.rpc.clear()
            except Exception:
                self.connected = False

    def close(self) -> None:
        if self.rpc:
            try:
                self.rpc.close()
            except Exception:
                pass
        self.connected = False
