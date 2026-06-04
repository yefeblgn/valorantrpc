from __future__ import annotations

import inspect
import logging

from pypresence import Presence

logger = logging.getLogger(__name__)

# pypresence update()'in kabul ettiği geçerli parametreler (self/pid hariç).
# Geçersiz bir anahtar tüm RPC'yi kırmasın diye payload bununla filtrelenir.
_VALID_KEYS = {
    p for p in inspect.signature(Presence.update).parameters
    if p not in ("self", "pid", "payload_override")
}


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
            logger.info("Discord RPC connected")
            return True
        except Exception as e:
            logger.debug("Discord RPC connect failed: %s", e)
            self.connected = False
            return False

    def update(self, presence: dict) -> bool:
        if not self.connected:
            if not self.connect():
                return False
        try:
            clean = {k: v for k, v in presence.items()
                     if v is not None and k in _VALID_KEYS}
            self.rpc.update(**clean)
            return True
        except Exception as e:
            logger.debug("Presence update failed: %s", e)
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
