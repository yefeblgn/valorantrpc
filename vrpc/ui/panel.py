from __future__ import annotations

import io
import logging
import threading
import sys
import webbrowser

import customtkinter as ctk
import requests
from PIL import Image

from version import __version__
from ..constants import GITHUB_URL
from ..i18n import t
from . import icons
from ..core.updater import Updater

logger = logging.getLogger(__name__)

ACCENT   = "#ff4655"
ACCENT_H = "#e03b49"
BG       = "#0f1117"
BG_CARD  = "#161922"
BG_TITLE = "#0b0d13"
SEP      = "#1c1f2e"
BADGE    = "#1e2235"
MUTED    = "#6a6e82"
DIM      = "#3e4155"
FONT     = "Segoe UI"
W, H     = 300, 680

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("dark-blue")


def _f(size: int = 13, bold: bool = False) -> ctk.CTkFont:
    return ctk.CTkFont(family=FONT, size=size, weight="bold" if bold else "normal")


class UpdateSplash(ctk.CTkToplevel):
    def __init__(self, parent, language: str) -> None:
        super().__init__(parent)
        self.language = language
        self.overrideredirect(True)
        self.wm_attributes("-topmost", True)
        self.configure(fg_color=BG)
        self.resizable(False, False)

        w, h = 240, 330
        sw, sh = self.winfo_screenwidth(), self.winfo_screenheight()
        self.geometry(f"{w}x{h}+{(sw - w) // 2}+{(sh - h) // 2}")

        ai = icons.app_icon_image().resize((80, 80), Image.LANCZOS)
        self._ai = ctk.CTkImage(light_image=ai, dark_image=ai, size=(80, 80))
        self.logo_lbl = ctk.CTkLabel(self, image=self._ai, text="")
        self.logo_lbl.pack(pady=(40, 10))

        self.title_lbl = ctk.CTkLabel(self, text="ValorantRPC", font=_f(16, True), text_color="white")
        self.title_lbl.pack()

        self.status_lbl = ctk.CTkLabel(self, text=f"{t(language, 'updating')}...", font=_f(12), text_color=MUTED)
        self.status_lbl.pack(pady=(20, 10))

        self.pbar = ctk.CTkProgressBar(self, width=180, height=4, progress_color=ACCENT, fg_color=BADGE)
        self.pbar.set(0.0)
        self.pbar.pack(pady=5)

        self.pct_lbl = ctk.CTkLabel(self, text="0%", font=_f(11, True), text_color=MUTED)
        self.pct_lbl.pack()

        self.details_lbl = ctk.CTkLabel(self, text="", font=_f(10), text_color=MUTED)
        self.details_lbl.pack(pady=(2, 0))

        self.update_idletasks()

    def set_progress_details(self, progress: float, downloaded: int, total_size: int, speed: float) -> None:
        self.pbar.set(progress)
        self.pct_lbl.configure(text=f"{int(progress * 100)}%")

        dl_mb = downloaded / 1024 / 1024
        tot_mb = total_size / 1024 / 1024

        remaining_str = ""
        if speed > 0 and total_size > downloaded:
            rem_sec = (total_size - downloaded) / speed
            if rem_sec < 60:
                remaining_str = f" ({int(rem_sec)}s {t(self.language, 'remaining')})"
            else:
                rem_min = int(rem_sec // 60)
                rem_sec_left = int(rem_sec % 60)
                remaining_str = f" ({rem_min}m {rem_sec_left}s {t(self.language, 'remaining')})"

        self.details_lbl.configure(text=f"{dl_mb:.1f} MB / {tot_mb:.1f} MB{remaining_str}")
        self.update_idletasks()


class Panel(ctk.CTk):
    def __init__(self, settings, poller, on_setting_change, on_quit) -> None:
        super().__init__()
        self.settings = settings
        self.poller = poller
        self.content = poller.content
        self.on_setting_change = on_setting_change
        self._on_quit = on_quit
        self.updater = Updater()
        self._img_cache: dict[str, ctk.CTkImage] = {}
        self._agent_name_to_uuid: dict[str, str] = {}
        self._dx = self._dy = 0

        self.overrideredirect(True)
        self.wm_attributes("-topmost", True)
        self.configure(fg_color=BG)
        self.resizable(False, False)
        self.withdraw()

        self._build()
        self._retext()
        self._load_agents_list()
        self._check_updates()
        self._refresh_loop()

    def _snap_br(self) -> None:
        self.update_idletasks()
        content_h = self.body._parent_frame.winfo_reqheight() + 42 + 10
        h = min(content_h, 580)
        sw, sh = self.winfo_screenwidth(), self.winfo_screenheight()
        self.geometry(f"{W}x{h}+{sw - W - 14}+{sh - h - 54}")

    def _resize_to_fit(self) -> None:
        self.update_idletasks()
        content_h = self.body._parent_frame.winfo_reqheight() + 42 + 10
        h = min(content_h, 580)
        if h > 0 and self.winfo_height() != h:
            sw, sh = self.winfo_screenwidth(), self.winfo_screenheight()
            x = sw - W - 14
            y = sh - h - 54
            self.geometry(f"{W}x{h}+{x}+{y}")

    def _build(self) -> None:
        title = ctk.CTkFrame(self, fg_color=BG_TITLE, height=42, corner_radius=0)
        title.pack(fill="x")
        title.pack_propagate(False)
        for w in (title,):
            w.bind("<ButtonPress-1>", self._ds)
            w.bind("<B1-Motion>", self._dm)

        ai = icons.app_icon_image().resize((22, 22), Image.LANCZOS)
        self._ai = ctk.CTkImage(light_image=ai, dark_image=ai, size=(22, 22))
        il = ctk.CTkLabel(title, image=self._ai, text="")
        il.pack(side="left", padx=(12, 6))
        il.bind("<ButtonPress-1>", self._ds)
        il.bind("<B1-Motion>", self._dm)

        tl = ctk.CTkLabel(title, text="ValorantRPC", font=_f(13, True))
        tl.pack(side="left")
        tl.bind("<ButtonPress-1>", self._ds)
        tl.bind("<B1-Motion>", self._dm)

        ctk.CTkButton(
            title, text="✕", width=38, height=42, corner_radius=0,
            fg_color="transparent", hover_color="#2d1217",
            text_color="#888", font=_f(12), command=self.hide,
        ).pack(side="right")

        self.body = body = ctk.CTkScrollableFrame(
            self, fg_color=BG, corner_radius=0,
            scrollbar_button_color=DIM, scrollbar_button_hover_color=MUTED,
            scrollbar_fg_color="transparent"
        )
        body.pack(fill="both", expand=True)

        self.update_banner = ctk.CTkFrame(body, fg_color="#d09000", corner_radius=8)
        self.update_lbl = ctk.CTkLabel(self.update_banner, text="", font=_f(11, True), text_color="black", cursor="hand2")
        self.update_lbl.pack(fill="x", padx=10, pady=6)
        self.update_banner.bind("<Button-1>", lambda e: self._start_update())
        self.update_lbl.bind("<Button-1>", lambda e: self._start_update())

        def card(**kw) -> ctk.CTkFrame:
            f = ctk.CTkFrame(body, fg_color=BG_CARD, corner_radius=10, **kw)
            f.pack(fill="x", padx=10, pady=(0, 6))
            return f

        p = card()
        self.banner = ctk.CTkLabel(p, text="", height=74)
        self.banner.pack(fill="x")
        ctk.CTkFrame(p, height=1, fg_color=SEP).pack(fill="x")
        ir = ctk.CTkFrame(p, fg_color="transparent")
        ir.pack(fill="x", padx=12, pady=(8, 10))
        self.name_lbl = ctk.CTkLabel(ir, text="—", font=_f(15, True), anchor="w")
        self.name_lbl.pack(anchor="w")
        rr = ctk.CTkFrame(ir, fg_color="transparent")
        rr.pack(anchor="w", pady=(3, 0))
        self.rank_icon = ctk.CTkLabel(rr, text="", width=20)
        self.rank_icon.pack(side="left")
        self.rank_lbl = ctk.CTkLabel(rr, text="", font=_f(12), text_color=MUTED)
        self.rank_lbl.pack(side="left", padx=(5, 0))

        body.pack_configure(pady=(8, 0))

        act = ctk.CTkFrame(body, fg_color=BG_CARD, corner_radius=10)
        act.pack(fill="x", padx=10, pady=(0, 6))
        sr = ctk.CTkFrame(act, fg_color="transparent")
        sr.pack(fill="x", padx=12, pady=(10, 4))
        self.dot = ctk.CTkLabel(sr, text="●", text_color="#383b50", font=_f(12), width=14)
        self.dot.pack(side="left")
        self.status_lbl = ctk.CTkLabel(sr, text="—", font=_f(13, True))
        self.status_lbl.pack(side="left", padx=(6, 0))
        ctk.CTkFrame(act, height=1, fg_color=SEP).pack(fill="x", padx=12)
        self.df = ctk.CTkFrame(act, fg_color="transparent")
        self.df.pack(fill="x", padx=12, pady=(4, 10))
        self._rows: dict[str, tuple] = {}
        for key in ("mode", "map", "agent", "score", "party"):
            row = ctk.CTkFrame(self.df, fg_color="transparent")
            bg = ctk.CTkFrame(row, width=24, height=24, corner_radius=5, fg_color=BADGE)
            bg.pack(side="left")
            bg.pack_propagate(False)
            ic = ctk.CTkLabel(bg, text="", width=18, height=18)
            ic.place(relx=0.5, rely=0.5, anchor="center")
            tx = ctk.CTkLabel(row, text="", font=_f(11), text_color=MUTED, anchor="w")
            tx.pack(side="left", padx=(7, 0))
            self._rows[key] = (row, ic, tx)

        ctrl = ctk.CTkFrame(body, fg_color=BG_CARD, corner_radius=10)
        ctrl.pack(fill="x", padx=10, pady=(0, 6))

        def sep():
            ctk.CTkFrame(ctrl, height=1, fg_color=SEP).pack(fill="x", padx=12)

        def sw_row(pady_=(8, 4)) -> tuple:
            r = ctk.CTkFrame(ctrl, fg_color="transparent")
            r.pack(fill="x", padx=12, pady=pady_)
            sw = ctk.CTkSwitch(r, text="", progress_color=ACCENT, width=38, height=20)
            sw.pack(side="left")
            lb = ctk.CTkLabel(r, text="", font=_f(12))
            lb.pack(side="left", padx=(8, 0))
            return sw, lb

        self.rpc_sw, self.rpc_lbl = sw_row()
        self.rpc_sw.configure(command=self._toggle_rpc)
        if self.settings.rpc_enabled:
            self.rpc_sw.select()

        sep()

        lr = ctk.CTkFrame(ctrl, fg_color="transparent")
        lr.pack(fill="x", padx=12, pady=(5, 5))
        self.lang_cap = ctk.CTkLabel(lr, text="", font=_f(12))
        self.lang_cap.pack(side="left")
        self.lang_seg = ctk.CTkSegmentedButton(
            lr, values=["TR", "EN"], command=self._set_lang,
            selected_color=ACCENT, selected_hover_color=ACCENT_H, font=_f(11, True), width=76,
        )
        self.lang_seg.set("TR" if self.settings.language == "tr" else "EN")
        self.lang_seg.pack(side="right")

        sep()

        self.auto_sw, self.auto_lbl = sw_row((4, 6))
        self.auto_sw.configure(command=self._toggle_auto)
        if self.settings.autostart:
            self.auto_sw.select()

        self.sep3 = sep()

        self.og = ctk.CTkFrame(ctrl, fg_color="transparent")
        self.og.pack(fill="x", padx=12, pady=(5, 10))
        self.og.columnconfigure(0, weight=1)
        self.og.columnconfigure(1, weight=1)
        self._chk: dict[str, ctk.CTkCheckBox] = {}
        for i, key in enumerate(("show_rank", "show_level", "show_party", "show_elapsed")):
            var = ctk.BooleanVar(value=getattr(self.settings, key))
            cb = ctk.CTkCheckBox(
                self.og, text="", variable=var, checkbox_width=17, checkbox_height=17,
                fg_color=ACCENT, hover_color=ACCENT_H, border_color="#2a2e42",
                command=lambda k=key, v=var: self._toggle_show(k, v), font=_f(11),
            )
            cb.grid(row=i // 2, column=i % 2, sticky="w", padx=2, pady=2)
            self._chk[key] = cb

        self.al_card = card()
        al_row = ctk.CTkFrame(self.al_card, fg_color="transparent")
        al_row.pack(fill="x", padx=12, pady=(8, 4))
        self.al_sw = ctk.CTkSwitch(al_row, text="", progress_color=ACCENT, width=38, height=20, command=self._toggle_al)
        self.al_sw.pack(side="left")
        self.al_lbl = ctk.CTkLabel(al_row, text="", font=_f(12))
        self.al_lbl.pack(side="left", padx=(8, 0))
        if self.settings.autolock_enabled:
            self.al_sw.select()

        ctk.CTkFrame(self.al_card, height=1, fg_color=SEP).pack(fill="x", padx=12)

        al_sel_row = ctk.CTkFrame(self.al_card, fg_color="transparent")
        al_sel_row.pack(fill="x", padx=12, pady=(6, 8))
        self.al_agent_lbl = ctk.CTkLabel(al_sel_row, text="", font=_f(12))
        self.al_agent_lbl.pack(side="left")

        self.al_opt = ctk.CTkOptionMenu(
            al_sel_row, values=["Loading..."], command=self._set_al_agent,
            fg_color=BADGE, button_color=ACCENT, button_hover_color=ACCENT_H,
            dropdown_fg_color=BG_CARD, dropdown_hover_color=BADGE,
            dropdown_text_color="white", text_color="white", font=_f(11), dropdown_font=_f(11),
            width=140
        )
        self.al_opt.pack(side="right")

        self.ft = ft = ctk.CTkFrame(body, fg_color="transparent")
        self.ft.pack(fill="x", padx=10, pady=(0, 10))
        self.ver_lbl = ctk.CTkLabel(ft, text=f"v{__version__}", text_color=DIM, font=_f(10))
        self.ver_lbl.pack(side="left")
        ctk.CTkButton(
            ft, text="GitHub", width=68, height=22,
            fg_color=ACCENT, hover_color=ACCENT_H, font=_f(11, True), corner_radius=6,
            command=lambda: webbrowser.open(GITHUB_URL),
        ).pack(side="right")

    def _check_updates(self) -> None:
        def work():
            if self.updater.check_for_updates():
                self.after(0, self._show_update_banner)
        threading.Thread(target=work, daemon=True).start()

    def _show_update_banner(self) -> None:
        lang = self.settings.language
        txt = f"{t(lang, 'update_available')} (v{self.updater.latest_version})"
        self.update_lbl.configure(text=txt)
        self.update_banner.pack(fill="x", padx=10, pady=(6, 0), before=self.banner.master)

    def _start_update(self) -> None:
        if self.updater.download_started:
            return
        if not getattr(sys, "frozen", False):
            webbrowser.open(self.updater.download_url)
            return
        self.withdraw()
        self.splash = UpdateSplash(self, self.settings.language)
        self.updater.start_download_and_install(
            on_progress=self._on_update_progress,
            on_done=self._on_update_done
        )

    def _on_update_progress(self, progress: float, downloaded: int = 0, total_size: int = 0, speed: float = 0.0) -> None:
        if hasattr(self, "splash") and self.splash:
            self.splash.set_progress_details(progress, downloaded, total_size, speed)
        percent = int(progress * 100)
        lang = self.settings.language
        self.update_lbl.configure(text=f"{t(lang, 'updating')}... {percent}%")

    def _on_update_done(self, success: bool) -> None:
        if hasattr(self, "splash") and self.splash:
            try:
                self.splash.destroy()
            except Exception:
                pass
            self.splash = None
        if not success:
            self.deiconify()
            self.lift()
            self.focus_force()
            lang = self.settings.language
            self.update_lbl.configure(text=t(lang, "update_failed"))

    def _ds(self, e):
        self._dx, self._dy = e.x_root - self.winfo_x(), e.y_root - self.winfo_y()

    def _dm(self, e):
        self.geometry(f"+{e.x_root - self._dx}+{e.y_root - self._dy}")

    def _toggle_al(self):
        self.settings.autolock_enabled = bool(self.al_sw.get())
        self.settings.save()
        self.on_setting_change("autolock_enabled")

    def _set_al_agent(self, val: str):
        uuid = self._agent_name_to_uuid.get(val, "")
        if uuid:
            self.settings.autolock_agent_uuid = uuid
            self.settings.save()
            self.on_setting_change("autolock_agent_uuid")

    def _load_agents_list(self) -> None:
        def work():
            try:
                agents = self.content.playable_agents()
                if agents:
                    self._agent_name_to_uuid = {name: uuid for uuid, name in agents}
                    names = [name for _, name in agents]
                    self.after(0, lambda: self._update_al_options(names))
            except Exception as e:
                logger.debug("Load agents list failed: %s", e)
        threading.Thread(target=work, daemon=True).start()

    def _update_al_options(self, names: list[str]) -> None:
        self.al_opt.configure(values=names)
        current_uuid = self.settings.autolock_agent_uuid
        current_name = ""
        if current_uuid:
            current_name = self.content.agent_name(current_uuid)
        if current_name in names:
            self.al_opt.set(current_name)
        elif names:
            self.al_opt.set(names[0])
            self._set_al_agent(names[0])

    def _retext(self) -> None:
        lang = self.settings.language
        self.rpc_lbl.configure(text=t(lang, "rpc_enabled"))
        self.lang_cap.configure(text=t(lang, "language"))
        self.auto_lbl.configure(text=t(lang, "autostart"))
        self.al_lbl.configure(text=t(lang, "autolock_enabled"))
        self.al_agent_lbl.configure(text=t(lang, "select_agent"))
        for key, cb in self._chk.items():
            cb.configure(text=t(lang, key))
        if self.updater.update_available:
            txt = f"{t(lang, 'update_available')} (v{self.updater.latest_version})"
            self.update_lbl.configure(text=txt)
        self._resize_to_fit()

    def _toggle_rpc(self):
        self.settings.rpc_enabled = bool(self.rpc_sw.get())
        self.settings.save()
        self.on_setting_change("rpc_enabled")

    def _set_lang(self, val: str):
        lang = "tr" if val == "TR" else "en"
        self.settings.language = lang
        self.settings.language_detected = True
        self.settings.save()
        self.content.set_language(lang)
        self._retext()
        self._load_agents_list()
        self.on_setting_change("language")

    def _toggle_auto(self):
        self.settings.autostart = bool(self.auto_sw.get())
        self.settings.save()
        self.on_setting_change("autostart")

    def _toggle_show(self, key, var):
        setattr(self.settings, key, bool(var.get()))
        self.settings.save()
        self.on_setting_change(key)

    def _load(self, url: str, setter, size: tuple) -> None:
        if not url:
            return
        k = f"{url}@{size}"
        if k in self._img_cache:
            setter(self._img_cache[k])
            return
        def work():
            try:
                r = requests.get(url, timeout=8)
                if r.status_code != 200:
                    return
                img = Image.open(io.BytesIO(r.content)).convert("RGBA")
                ci = ctk.CTkImage(light_image=img, dark_image=img, size=size)
                self._img_cache[k] = ci
                self.after(0, lambda: setter(ci))
            except Exception as e:
                logger.debug("img: %s", e)
        threading.Thread(target=work, daemon=True).start()

    def _refresh_loop(self) -> None:
        try:
            self._refresh()
        except Exception as e:
            logger.debug("refresh: %s", e)
        self.after(1000, self._refresh_loop)

    def _refresh(self) -> None:
        snap = self.poller.snapshot()
        state = snap["state"]
        lang = self.settings.language

        self.name_lbl.configure(
            text=f"{snap['name']}#{snap['tag']}" if snap["name"] else t(lang, "no_player")
        )

        if cu := self.content.card_wide(state.card_id):
            self._load(cu, lambda im: self.banner.configure(image=im, text=""), (280, 74))

        if state.competitive_tier > 0:
            rr = f"  ·  {state.rr} RR" if state.rr is not None else ""
            self.rank_lbl.configure(text=f"{self.content.tier_name(state.competitive_tier)}{rr}")
            if tu := self.content.tier_icon(state.competitive_tier):
                self._load(tu, lambda im: self.rank_icon.configure(image=im, text=""), (20, 20))
        else:
            self.rank_lbl.configure(text=t(lang, "unranked"))
            self.rank_icon.configure(image=None, text="")

        is_active = snap["valorant"] and state.session_state != "idle"

        if not is_active:
            self.dot.configure(text_color="#383b50")
            self.status_lbl.configure(text=t(lang, "status_idle"))
            self._hide_rows()
            self.sep3.pack_forget()
            self.og.pack_forget()
            self.al_card.pack_forget()
        else:
            clr = {"menus": "#3ba55d", "pregame": "#faa61a", "ingame": ACCENT, "idle": "#383b50"}
            key = {"menus": "status_menu", "pregame": "status_pregame",
                   "ingame": "status_ingame", "idle": "status_idle"}
            ss = state.session_state
            dot_color = "#f0a500" if state.is_queuing else clr.get(ss, "#383b50")
            status_text = t(lang, "queuing") if state.is_queuing else t(lang, key.get(ss, "status_menu"))
            self.dot.configure(text_color=dot_color)
            self.status_lbl.configure(text=status_text)
            self._show_rows(state, lang)

            self.sep3.pack(fill="x", padx=12)
            self.og.pack(fill="x", padx=12, pady=(5, 10))
            self.al_card.pack(fill="x", padx=10, pady=(0, 6), before=self.ft)

        self._resize_to_fit()

    def _hide_rows(self) -> None:
        for row, _, _ in self._rows.values():
            row.pack_forget()

    def _show_rows(self, state, lang: str) -> None:
        for row, _, _ in self._rows.values():
            row.pack_forget()
        items = []
        if state.queue_id or state.session_state != "menus":
            mode_name = t(lang, "custom") if state.is_custom else self.content.mode_name(state.queue_id)
            items.append(("mode", self.content.mode_icon(state.queue_id), (20, 20), mode_name))
        mn, _ = self.content.map_info(state.map_path)
        if mn:
            items.append(("map", None, None, f"{t(lang,'map')}: {mn}"))
        an = self.content.agent_name(state.agent_uuid)
        ai = self.content.agent_icon(state.agent_uuid) if state.agent_uuid else None
        if an or ai:
            items.append(("agent", ai, (20, 20), an or ""))
        if state.ally_score is not None and state.enemy_score is not None:
            items.append(("score", None, None,
                          f"{t(lang,'score')}: {state.ally_score} - {state.enemy_score}"))
        if state.party_size > 1:
            items.append(("party", None, None,
                          f"{t(lang,'party')}: {state.party_size}/{state.party_max}"))
        for k, iu, isz, txt in items:
            row, ic, tx = self._rows[k]
            tx.configure(text=txt)
            if iu and isz:
                self._load(iu, lambda im, l=ic: l.configure(image=im, text=""), isz)
            else:
                ic.configure(image=None, text="")
            row.pack(anchor="w", pady=2, fill="x")

    def sync_controls(self) -> None:
        self.after(0, self._sync)

    def _sync(self) -> None:
        (self.rpc_sw.select if self.settings.rpc_enabled else self.rpc_sw.deselect)()
        (self.auto_sw.select if self.settings.autostart else self.auto_sw.deselect)()
        (self.al_sw.select if self.settings.autolock_enabled else self.al_sw.deselect)()
        self.lang_seg.set("TR" if self.settings.language == "tr" else "EN")
        for key, cb in self._chk.items():
            (cb.select if getattr(self.settings, key) else cb.deselect)()
        self._retext()
        self._load_agents_list()

    def show(self) -> None:
        self.after(0, self._do_show)

    def _do_show(self) -> None:
        self._snap_br()
        self.deiconify()
        self.lift()
        self.focus_force()

    def hide(self) -> None:
        self.withdraw()

    def quit_app(self) -> None:
        self.after(0, self._on_quit)
