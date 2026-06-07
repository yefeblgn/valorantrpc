from __future__ import annotations

import logging

from .config import Settings, set_autostart
from .core.poller import Poller
from .i18n import t
from .ui.panel import Panel
from .ui.tray import Tray

logger = logging.getLogger(__name__)


class App:
    def __init__(self) -> None:
        self.settings = Settings.load()
        set_autostart(self.settings.autostart)
        self.poller = Poller(self.settings, on_update=self._on_poller_update)
        self.panel = Panel(
            self.settings, self.poller,
            on_setting_change=self._apply_setting,
            on_quit=self.quit,
        )
        self.tray = Tray(
            self.settings,
            callbacks={
                "show": self.panel.show,
                "toggle_rpc": self._tray_toggle_rpc,
                "set_language": self._tray_set_language,
                "toggle_autostart": self._tray_toggle_autostart,
                "quit": self.panel.quit_app,
            },
        )
        self._running = True

    def run(self) -> None:
        self.poller.start()
        self.tray.run()
        
        lang = self.settings.language
        self.tray.notify(t(lang, "notification_desc"), t(lang, "notification_title"))
        
        try:
            self.panel.mainloop()
        finally:
            self._shutdown()

    def quit(self) -> None:
        try:
            self.panel.quit()
        except Exception:
            pass

    def _shutdown(self) -> None:
        if not self._running:
            return
        self._running = False
        logger.info("Shutting down...")
        for target in (self.poller.stop, self.tray.stop, self.panel.destroy):
            try:
                target()
            except Exception:
                pass

    def _apply_setting(self, key: str) -> None:
        if key == "language":
            self.poller.content.set_language(self.settings.language)
            self.poller.force_refresh()
        elif key == "autostart":
            set_autostart(self.settings.autostart)
        else:
            self.poller.force_refresh()

    def _tray_toggle_rpc(self) -> None:
        self.settings.rpc_enabled = not self.settings.rpc_enabled
        self.settings.save()
        self._apply_setting("rpc_enabled")
        self.panel.sync_controls()

    def _tray_set_language(self, lang: str) -> None:
        self.settings.language = lang
        self.settings.language_detected = True
        self.settings.save()
        self._apply_setting("language")
        self.panel.sync_controls()

    def _tray_toggle_autostart(self) -> None:
        self.settings.autostart = not self.settings.autostart
        self.settings.save()
        self._apply_setting("autostart")
        self.panel.sync_controls()

    def _on_poller_update(self) -> None:
        snap = self.poller.snapshot()
        lang = self.settings.language
        if not snap["valorant"]:
            status = t(lang, "status_idle")
        else:
            status = t(lang, {
                "menus": "status_menu",
                "pregame": "status_pregame",
                "ingame": "status_ingame",
            }.get(snap["state"].session_state, "status_menu"))
        self.tray.update(active=snap["valorant"], status_text=status)
        self.panel.after(0, self.panel._refresh)


def run() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    App().run()
