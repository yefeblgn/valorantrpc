"""Kompakt, koyu temalı mini panel (customtkinter)."""

from __future__ import annotations

import io
import logging
import threading
import webbrowser

import customtkinter as ctk
import requests
from PIL import Image

from version import __version__
from ..constants import GITHUB_URL
from ..i18n import t
from . import icons

logger = logging.getLogger(__name__)

ACCENT = "#ff4655"
ACCENT_HOVER = "#e03b49"
BG_CARD = "#1b1d24"

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("dark-blue")


class Panel(ctk.CTk):
    def __init__(self, settings, poller, on_setting_change, on_quit) -> None:
        super().__init__()
        self.settings = settings
        self.poller = poller
        self.content = poller.content
        self.on_setting_change = on_setting_change  # (key) -> None
        self._on_quit = on_quit
        self._img_cache: dict[str, ctk.CTkImage] = {}

        self.title("ValorantRPC")
        self.geometry("380x560")
        self.minsize(380, 560)
        self.resizable(False, False)
        self.configure(fg_color="#121317")
        ico = icons.app_ico_path()
        if ico:
            try:
                self.iconbitmap(ico)
            except Exception:
                pass

        self.protocol("WM_DELETE_WINDOW", self.hide)
        self._build()
        self._retext()
        self._refresh_loop()

    # ------------------------------------------------------------------ #
    def _build(self) -> None:
        pad = {"padx": 16, "pady": (0, 10)}

        # --- Başlık ---
        header = ctk.CTkFrame(self, fg_color=BG_CARD, corner_radius=14)
        header.pack(fill="x", padx=16, pady=(16, 10))

        self.banner_label = ctk.CTkLabel(header, text="", height=96)
        self.banner_label.pack(fill="x", padx=8, pady=8)

        self.name_label = ctk.CTkLabel(
            header, text="—", font=ctk.CTkFont(size=18, weight="bold")
        )
        self.name_label.pack(anchor="w", padx=14)

        rankrow = ctk.CTkFrame(header, fg_color="transparent")
        rankrow.pack(fill="x", padx=14, pady=(0, 10))
        self.rank_icon_label = ctk.CTkLabel(rankrow, text="", width=28)
        self.rank_icon_label.pack(side="left")
        self.rank_label = ctk.CTkLabel(
            rankrow, text="", font=ctk.CTkFont(size=13), text_color="#b9bcc6"
        )
        self.rank_label.pack(side="left", padx=6)

        # --- Anlık aktivite ---
        self.activity = ctk.CTkFrame(self, fg_color=BG_CARD, corner_radius=14)
        self.activity.pack(fill="x", **pad)

        self.status_dot = ctk.CTkLabel(
            self.activity, text="●", text_color="#5a5d66",
            font=ctk.CTkFont(size=16),
        )
        self.status_dot.grid(row=0, column=0, padx=(14, 6), pady=(12, 4), sticky="w")
        self.status_label = ctk.CTkLabel(
            self.activity, text="—", font=ctk.CTkFont(size=15, weight="bold")
        )
        self.status_label.grid(row=0, column=1, pady=(12, 4), sticky="w")

        self.detail_label = ctk.CTkLabel(
            self.activity, text="", justify="left",
            font=ctk.CTkFont(size=12), text_color="#9a9da7",
        )
        self.detail_label.grid(row=1, column=0, columnspan=2, padx=14, pady=(0, 12), sticky="w")

        # --- Kontroller ---
        ctrl = ctk.CTkFrame(self, fg_color=BG_CARD, corner_radius=14)
        ctrl.pack(fill="x", **pad)

        self.rpc_switch = ctk.CTkSwitch(
            ctrl, text="", command=self._toggle_rpc,
            progress_color=ACCENT, font=ctk.CTkFont(size=13),
        )
        self.rpc_switch.pack(anchor="w", padx=14, pady=(12, 6))
        if self.settings.rpc_enabled:
            self.rpc_switch.select()

        langrow = ctk.CTkFrame(ctrl, fg_color="transparent")
        langrow.pack(fill="x", padx=14, pady=6)
        self.lang_caption = ctk.CTkLabel(langrow, text="", font=ctk.CTkFont(size=13))
        self.lang_caption.pack(side="left")
        self.lang_seg = ctk.CTkSegmentedButton(
            langrow, values=["TR", "EN"], command=self._set_language,
            selected_color=ACCENT, selected_hover_color=ACCENT_HOVER,
        )
        self.lang_seg.set("TR" if self.settings.language == "tr" else "EN")
        self.lang_seg.pack(side="right")

        self.autostart_switch = ctk.CTkSwitch(
            ctrl, text="", command=self._toggle_autostart,
            progress_color=ACCENT, font=ctk.CTkFont(size=13),
        )
        self.autostart_switch.pack(anchor="w", padx=14, pady=6)
        if self.settings.autostart:
            self.autostart_switch.select()

        # show_* küçük seçenekler
        opts = ctk.CTkFrame(ctrl, fg_color="transparent")
        opts.pack(fill="x", padx=14, pady=(6, 12))
        self._chk = {}
        for i, key in enumerate(("show_rank", "show_level", "show_party", "show_elapsed")):
            var = ctk.BooleanVar(value=getattr(self.settings, key))
            chk = ctk.CTkCheckBox(
                opts, text="", variable=var, width=20, checkbox_width=18,
                checkbox_height=18, fg_color=ACCENT, hover_color=ACCENT_HOVER,
                command=lambda k=key, v=var: self._toggle_show(k, v),
                font=ctk.CTkFont(size=11),
            )
            chk.grid(row=i // 2, column=i % 2, sticky="w", padx=4, pady=3)
            self._chk[key] = chk

        # --- Alt bilgi ---
        footer = ctk.CTkFrame(self, fg_color="transparent")
        footer.pack(fill="x", side="bottom", padx=16, pady=10)
        self.version_label = ctk.CTkLabel(
            footer, text=f"v{__version__}", text_color="#6b6e78",
            font=ctk.CTkFont(size=11),
        )
        self.version_label.pack(side="left")
        self.github_btn = ctk.CTkButton(
            footer, text="GitHub", width=80, height=26, fg_color=ACCENT,
            hover_color=ACCENT_HOVER, command=lambda: webbrowser.open(GITHUB_URL),
        )
        self.github_btn.pack(side="right")

    # ------------------------------------------------------------------ #
    def _retext(self) -> None:
        lang = self.settings.language
        self.rpc_switch.configure(text=t(lang, "rpc_enabled"))
        self.lang_caption.configure(text=t(lang, "language"))
        self.autostart_switch.configure(text=t(lang, "autostart"))
        labels = {
            "show_rank": "show_rank", "show_level": "show_level",
            "show_party": "show_party", "show_elapsed": "show_elapsed",
        }
        for key, chk in self._chk.items():
            chk.configure(text=t(lang, labels[key]))

    # ---- kontrol callback'leri ----
    def _toggle_rpc(self) -> None:
        self.settings.rpc_enabled = bool(self.rpc_switch.get())
        self.settings.save()
        self.on_setting_change("rpc_enabled")

    def _set_language(self, value: str) -> None:
        lang = "tr" if value == "TR" else "en"
        self.settings.language = lang
        self.settings.language_detected = True
        self.settings.save()
        self.content.set_language(lang)
        self._retext()
        self.on_setting_change("language")

    def _toggle_autostart(self) -> None:
        self.settings.autostart = bool(self.autostart_switch.get())
        self.settings.save()
        self.on_setting_change("autostart")

    def _toggle_show(self, key: str, var) -> None:
        setattr(self.settings, key, bool(var.get()))
        self.settings.save()
        self.on_setting_change(key)

    # ---- görsel yükleme ----
    def _load_image(self, url: str, setter, size) -> None:
        if not url:
            return
        cache_key = f"{url}@{size}"
        if cache_key in self._img_cache:
            setter(self._img_cache[cache_key])
            return

        def work():
            try:
                r = requests.get(url, timeout=8)
                if r.status_code != 200:
                    return
                img = Image.open(io.BytesIO(r.content)).convert("RGBA")
                cimg = ctk.CTkImage(light_image=img, dark_image=img, size=size)
                self._img_cache[cache_key] = cimg
                self.after(0, lambda: setter(cimg))
            except Exception as e:
                logger.debug("Görsel yüklenemedi: %s", e)

        threading.Thread(target=work, daemon=True).start()

    # ---- periyodik yenileme ----
    def _refresh_loop(self) -> None:
        try:
            self._refresh()
        except Exception as e:
            logger.debug("Panel yenileme hatası: %s", e)
        self.after(1000, self._refresh_loop)

    def _refresh(self) -> None:
        snap = self.poller.snapshot()
        state = snap["state"]
        lang = self.settings.language

        # Oyuncu
        if snap["name"]:
            self.name_label.configure(text=f"{snap['name']}#{snap['tag']}")
        else:
            self.name_label.configure(text=t(lang, "no_player"))

        # Banner (profil kartı)
        card_url = self.content.card_wide(state.card_id)
        if card_url:
            self._load_image(
                card_url,
                lambda im: self.banner_label.configure(image=im, text=""),
                (332, 96),
            )

        # Rank
        if state.competitive_tier > 0:
            name = self.content.tier_name(state.competitive_tier)
            rr = f" · {state.rr} RR" if state.rr is not None else ""
            self.rank_label.configure(text=f"{name}{rr}")
            self._load_image(
                self.content.tier_icon(state.competitive_tier),
                lambda im: self.rank_icon_label.configure(image=im, text=""),
                (24, 24),
            )
        else:
            self.rank_label.configure(text=t(lang, "unranked"))
            self.rank_icon_label.configure(image=None, text="")

        # Durum
        if not snap["valorant"]:
            self.status_dot.configure(text_color="#5a5d66")
            self.status_label.configure(text=t(lang, "status_idle"))
            self.detail_label.configure(text="")
            return

        status_map = {
            "menus": ("status_menu", "#3ba55d"),
            "pregame": ("status_pregame", "#faa61a"),
            "ingame": ("status_ingame", ACCENT),
            "idle": ("status_idle", "#5a5d66"),
        }
        key, color = status_map.get(state.session_state, ("status_menu", "#3ba55d"))
        self.status_dot.configure(text_color=color)
        self.status_label.configure(text=t(lang, key))
        self.detail_label.configure(text=self._detail_text(state, lang))

    def _detail_text(self, state, lang: str) -> str:
        lines = []
        if state.queue_id or state.session_state != "menus":
            lines.append(f"{t(lang, 'mode')}: {self.content.mode_name(state.queue_id)}")
        map_name, _ = self.content.map_info(state.map_path)
        if map_name:
            lines.append(f"{t(lang, 'map')}: {map_name}")
        agent = self.content.agent_name(state.agent_uuid)
        if agent:
            lines.append(f"{t(lang, 'agent')}: {agent}")
        if state.ally_score is not None and state.enemy_score is not None:
            lines.append(f"{t(lang, 'score')}: {state.ally_score} - {state.enemy_score}")
        if state.party_size > 1:
            lines.append(f"{t(lang, 'party')}: {state.party_size}/{state.party_max}")
        return "\n".join(lines)

    # ---- tray'den değişiklikte kontrolleri eşitle ----
    def sync_controls(self) -> None:
        self.after(0, self._sync_controls)

    def _sync_controls(self) -> None:
        (self.rpc_switch.select if self.settings.rpc_enabled else self.rpc_switch.deselect)()
        (self.autostart_switch.select if self.settings.autostart else self.autostart_switch.deselect)()
        self.lang_seg.set("TR" if self.settings.language == "tr" else "EN")
        for key, chk in self._chk.items():
            (chk.select if getattr(self.settings, key) else chk.deselect)()
        self._retext()

    # ---- göster/gizle ----
    def show(self) -> None:
        # Tray thread'inden de güvenli çağrılabilsin diye after ile sırala.
        self.after(0, self._do_show)

    def _do_show(self) -> None:
        self.deiconify()
        self.lift()
        self.focus_force()

    def hide(self) -> None:
        self.withdraw()

    def quit_app(self) -> None:
        self.after(0, self._on_quit)
