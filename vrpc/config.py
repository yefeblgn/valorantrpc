"""Kullanıcı ayarları (%LOCALAPPDATA%\\ValorantRPC\\config.json) ve Windows autostart.

Riot ad/tag/bölge BURADA tutulmaz — her açılışta yerel client'tan otomatik tespit edilir.
Burada yalnızca kullanıcının değiştirebileceği tercihler saklanır.
"""

from __future__ import annotations

import json
import logging
import sys
from dataclasses import asdict, dataclass, field

from .constants import APP_NAME, app_data_dir

logger = logging.getLogger(__name__)

CONFIG_PATH = app_data_dir() / "config.json"


@dataclass
class Settings:
    language: str = "en"          # "tr" | "en" (ilk açılışta otomatik belirlenir)
    rpc_enabled: bool = True
    autostart: bool = False
    show_rank: bool = True
    show_level: bool = True
    show_party: bool = True
    show_elapsed: bool = True
    # İlk çalıştırmada dilin otomatik tespit edilip edilmediği.
    language_detected: bool = False

    _dirty_fields: set = field(default_factory=set, repr=False, compare=False)

    # ---- yükleme / kaydetme ----
    @classmethod
    def load(cls) -> "Settings":
        s = cls()
        try:
            if CONFIG_PATH.exists():
                data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
                for key in (
                    "language", "rpc_enabled", "autostart", "show_rank",
                    "show_level", "show_party", "show_elapsed", "language_detected",
                ):
                    if key in data:
                        setattr(s, key, data[key])
        except Exception as e:
            logger.warning("Ayarlar okunamadı: %s", e)
        return s

    def save(self) -> None:
        try:
            data = {k: v for k, v in asdict(self).items() if not k.startswith("_")}
            CONFIG_PATH.write_text(
                json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
            )
        except Exception as e:
            logger.warning("Ayarlar kaydedilemedi: %s", e)


# --------------------------------------------------------------------------- #
# Windows autostart (HKCU\...\Run)
# --------------------------------------------------------------------------- #
_RUN_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"


def _executable_command() -> str:
    """Autostart için çalıştırılacak komut (.exe ise kendisi, değilse python -m vrpc)."""
    if getattr(sys, "frozen", False):
        return f'"{sys.executable}"'
    return f'"{sys.executable}" -m vrpc'


def is_autostart_enabled() -> bool:
    try:
        import winreg

        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, _RUN_KEY) as key:
            winreg.QueryValueEx(key, APP_NAME)
        return True
    except FileNotFoundError:
        return False
    except Exception:
        return False


def set_autostart(enabled: bool) -> bool:
    """Autostart anahtarını yaz/sil. Başarılıysa True döner."""
    try:
        import winreg

        if enabled:
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, _RUN_KEY) as key:
                winreg.SetValueEx(
                    key, APP_NAME, 0, winreg.REG_SZ, _executable_command()
                )
        else:
            try:
                with winreg.OpenKey(
                    winreg.HKEY_CURRENT_USER, _RUN_KEY, 0, winreg.KEY_SET_VALUE
                ) as key:
                    winreg.DeleteValue(key, APP_NAME)
            except FileNotFoundError:
                pass
        return True
    except Exception as e:
        logger.warning("Autostart ayarlanamadı: %s", e)
        return False
