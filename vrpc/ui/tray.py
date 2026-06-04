from __future__ import annotations

import logging

import pystray
from pystray import Menu, MenuItem

from ..constants import APP_NAME
from ..i18n import t
from . import icons

logger = logging.getLogger(__name__)


class Tray:
    def __init__(self, settings, callbacks: dict) -> None:
        self.settings = settings
        self.cb = callbacks
        self._active = False
        self.icon = pystray.Icon(
            APP_NAME,
            icon=icons.tray_image(False),
            title=APP_NAME,
            menu=self._build_menu(),
        )

    def _txt(self, key):
        return lambda item: t(self.settings.language, key)

    def _build_menu(self) -> Menu:
        return Menu(
            MenuItem(self._txt("tray_show"), lambda: self.cb["show"](), default=True),
            Menu.SEPARATOR,
            MenuItem(self._txt("rpc_enabled"), lambda: self.cb["toggle_rpc"](),
                     checked=lambda i: self.settings.rpc_enabled),
            MenuItem(self._txt("language"), Menu(
                MenuItem("Türkçe", lambda: self.cb["set_language"]("tr"),
                         checked=lambda i: self.settings.language == "tr", radio=True),
                MenuItem("English", lambda: self.cb["set_language"]("en"),
                         checked=lambda i: self.settings.language == "en", radio=True),
            )),
            MenuItem(self._txt("autostart"), lambda: self.cb["toggle_autostart"](),
                     checked=lambda i: self.settings.autostart),
            Menu.SEPARATOR,
            MenuItem(self._txt("tray_quit"), lambda: self.cb["quit"]()),
        )

    def run(self) -> None:
        self.icon.run_detached()

    def stop(self) -> None:
        try:
            self.icon.stop()
        except Exception:
            pass

    def update(self, active: bool, status_text: str) -> None:
        try:
            if active != self._active:
                self._active = active
                self.icon.icon = icons.tray_image(active)
            self.icon.title = f"{APP_NAME} · {status_text}"
        except Exception as e:
            logger.debug("Tray update error: %s", e)
