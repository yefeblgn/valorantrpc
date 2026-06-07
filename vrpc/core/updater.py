from __future__ import annotations

import logging
import os
import subprocess
import sys
import tempfile
import threading
from pathlib import Path
import requests

from version import __version__, GITHUB_RELEASES_URL

logger = logging.getLogger(__name__)


class Updater:
    def __init__(self) -> None:
        self.update_available = False
        self.latest_version = ""
        self.download_url = ""
        self.download_progress = 0.0
        self.download_started = False
        self.download_failed = False
        self.download_success = False

    def check_for_updates(self) -> bool:
        try:
            r = requests.get(GITHUB_RELEASES_URL, headers={"User-Agent": "ValorantRPC-Updater"}, timeout=5)
            if r.status_code != 200:
                return False
            data = r.json()
            tag = data.get("tag_name", "").strip().lstrip("v")
            if not tag:
                return False

            self.latest_version = tag

            curr_parts = [int(x) for x in __version__.split(".") if x.isdigit()]
            latest_parts = [int(x) for x in tag.split(".") if x.isdigit()]

            while len(curr_parts) < 3:
                curr_parts.append(0)
            while len(latest_parts) < 3:
                latest_parts.append(0)

            if latest_parts > curr_parts:
                for asset in data.get("assets", []):
                    if asset.get("name") == "ValorantRPC.exe":
                        self.download_url = asset.get("browser_download_url")
                        self.update_available = True
                        logger.info("New update available: v%s", tag)
                        return True
        except Exception as e:
            logger.debug("Update check failed: %s", e)
        return False

    def start_download_and_install(self, on_progress=None, on_done=None) -> None:
        if not self.download_url or self.download_started:
            return
        self.download_started = True
        self.download_failed = False
        self.download_success = False

        def work():
            try:
                if not getattr(sys, "frozen", False):
                    import webbrowser
                    webbrowser.open(self.download_url)
                    self.download_success = True
                    if on_done:
                        on_done(True)
                    return

                exe_path = Path(sys.executable)
                new_exe_path = exe_path.with_name("ValorantRPC.exe.new")

                r = requests.get(self.download_url, stream=True, headers={"User-Agent": "ValorantRPC-Updater"}, timeout=30)
                if r.status_code != 200:
                    raise Exception(f"Download HTTP {r.status_code}")

                total_size = int(r.headers.get("content-length", 0))
                downloaded = 0

                with open(new_exe_path, "wb") as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                            downloaded += len(chunk)
                            if total_size > 0:
                                self.download_progress = downloaded / total_size
                                if on_progress:
                                    on_progress(self.download_progress)

                self.download_success = True
                if on_done:
                    on_done(True)

                self._apply_update_and_restart(exe_path, new_exe_path)
            except Exception as e:
                logger.error("Download failed: %s", e)
                self.download_failed = True
                self.download_started = False
                if on_done:
                    on_done(False)

        threading.Thread(target=work, daemon=True).start()

    def _apply_update_and_restart(self, current_exe: Path, new_exe: Path) -> None:
        bat_content = f"""@echo off
timeout /t 1 /nobreak > nul
:loop
del "{current_exe}"
if exist "{current_exe}" (
    timeout /t 1 /nobreak > nul
    goto loop
)
ren "{new_exe}" "{current_exe.name}"
start "" "{current_exe}"
del "%~f0"
"""
        temp_dir = Path(tempfile.gettempdir())
        bat_path = temp_dir / "vrpc_update.bat"
        bat_path.write_text(bat_content, encoding="utf-8")

        subprocess.Popen(
            [str(bat_path)],
            shell=True,
            creationflags=0x08000000 | 0x00000008
        )

        logger.info("Restarting application to apply update...")
        os._exit(0)
