"""
Valorant RPC GUI v2 - Premium Modern Arayüz
System Tray desteği ile
"""

import customtkinter as ctk
import threading
import time
import logging
from typing import Optional
from PIL import Image, ImageTk
import pystray
from pystray import MenuItem as item
import sys
import webbrowser
import requests
from io import BytesIO

from config import Config
from discord_rpc import DiscordRPC
from valorant_client_v2 import ValorantClientV2
from presence_builder_v2 import PresenceBuilderV2
from version import __version__, GITHUB_RELEASES_URL, GITHUB_REPO_URL

# CustomTkinter tema
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

class ValorantRPCGUI(ctk.CTk):
    """Premium Valorant RPC Arayüzü"""
    
    def __init__(self):
        super().__init__()
        
        # Pencere ayarları
        self.title("Valorant RPC - github.com/yefeblgn")
        self.geometry("900x650")
        self.resizable(False, False)
        
        # Icon ayarla
        try:
            self.iconbitmap("assets/game_icon_white.ico")
        except:
            pass
        
        # RPC bileşenleri
        self.config = Config()
        
        # Durum değişkenleri
        self.running = False
        self.connected_discord = False
        self.connected_valorant = False
        self.rpc_thread: Optional[threading.Thread] = None
        self.player_data = {}
        
        # System tray
        self.tray_icon = None
        self.is_minimized = False
        
        # Sürüm kontrolü
        self.current_version = __version__
        self.latest_version = None
        self.update_available = False
        
        # Logging
        self.setup_logging()
        
        # UI oluştur
        self.create_ui()
        
        # Pencere kapatma eventi
        self.protocol("WM_DELETE_WINDOW", self.on_closing)
        
        # Minimize eventi
        self.bind("<Unmap>", self.on_minimize)
        
        # Pencereyi ortala
        self.center_window()
        
        # İlk çalıştırma kontrolü
        if self.config.is_first_run or not self.config.validate():
            self.after(100, self.show_welcome_dialog)
        else:
            # Config geçerliyse bileşenleri başlat
            self.init_rpc_components()
            
            # Sürüm kontrolü yap (arka planda)
            threading.Thread(target=self.check_for_updates, daemon=True).start()
            
            # Otomatik başlat
            self.after(500, self.auto_start)
    
    def init_rpc_components(self):
        """RPC bileşenlerini başlat"""
        try:
            self.client = ValorantClientV2(region=self.config.region)
            self.rpc = DiscordRPC(self.config.discord_client_id)
            self.presence_builder = PresenceBuilderV2()
        except Exception as e:
            self.logger.error(f"RPC bileşenleri başlatılamadı: {e}")
    
    def center_window(self):
        """Pencereyi ekranın ortasına al"""
        self.update_idletasks()
        width = self.winfo_width()
        height = self.winfo_height()
        x = (self.winfo_screenwidth() // 2) - (width // 2)
        y = (self.winfo_screenheight() // 2) - (height // 2)
        self.geometry(f'{width}x{height}+{x}+{y}')
    
    def open_github(self):
        """GitHub profilini aç"""
        webbrowser.open("https://github.com/yefeblgn")
    
    def check_for_updates(self):
        """GitHub'dan son sürümü kontrol et"""
        try:
            response = requests.get(GITHUB_RELEASES_URL, timeout=5)
            if response.status_code == 200:
                data = response.json()
                # GitHub release tag'inden 'v' prefix'ini kaldır
                latest_version = data.get('tag_name', '').replace('v', '')
                self.latest_version = latest_version
                
                # Sürüm karşılaştırma
                if latest_version and self.compare_versions(latest_version, self.current_version) > 0:
                    self.update_available = True
                    self.logger.info(f"✨ Yeni sürüm mevcut: v{latest_version} (Mevcut: v{self.current_version})")
                    # Butonu güncelle
                    self.after(0, self.update_button_for_update)
                else:
                    self.logger.info(f"✅ En güncel sürüm kullanılıyor: v{self.current_version}")
        except Exception as e:
            self.logger.error(f"Sürüm kontrolü başarısız: {e}")
    
    def compare_versions(self, v1: str, v2: str) -> int:
        """İki sürümü karşılaştır. v1 > v2 ise 1, v1 < v2 ise -1, eşitse 0 döner"""
        try:
            v1_parts = [int(x) for x in v1.split('.')]
            v2_parts = [int(x) for x in v2.split('.')]
            
            # Uzunlukları eşitle
            while len(v1_parts) < len(v2_parts):
                v1_parts.append(0)
            while len(v2_parts) < len(v1_parts):
                v2_parts.append(0)
            
            # Karşılaştır
            for i in range(len(v1_parts)):
                if v1_parts[i] > v2_parts[i]:
                    return 1
                elif v1_parts[i] < v2_parts[i]:
                    return -1
            return 0
        except:
            return 0
    
    def update_button_for_update(self):
        """Butonu güncelleme moduna al"""
        self.start_button.configure(
            text="🔄 GÜNCELLE",
            fg_color="#FF9800",
            hover_color="#F57C00"
        )
    
    def auto_start(self):
        """Otomatik RPC başlat"""
        if not self.running and not self.update_available:
            self.start_rpc()
    
    def show_welcome_dialog(self):
        """İlk çalıştırma hoş geldin dialog'u"""
        dialog = ctk.CTkToplevel(self)
        dialog.title("Hoş Geldiniz! - Valorant RPC")
        dialog.geometry("500x680")
        dialog.resizable(False, False)
        dialog.transient(self)
        dialog.grab_set()
        
        # Icon ayarla
        try:
            dialog.iconbitmap("assets/game_icon_white.ico")
        except:
            pass
        
        # Dialog'u ortala
        dialog.update_idletasks()
        x = (dialog.winfo_screenwidth() // 2) - (500 // 2)
        y = (dialog.winfo_screenheight() // 2) - (680 // 2)
        dialog.geometry(f'500x680+{x}+{y}')
        
        # Ana frame
        main_frame = ctk.CTkFrame(dialog, fg_color="#1A2029")
        main_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Header
        header = ctk.CTkLabel(
            main_frame,
            text="🎮 Valorant RPC'ye Hoş Geldiniz!",
            font=ctk.CTkFont(size=20, weight="bold", family="Arial"),
            text_color="#FF4654"
        )
        header.pack(pady=(10, 5))
        
        subtitle = ctk.CTkLabel(
            main_frame,
            text="Başlamak için lütfen bilgilerinizi girin",
            font=ctk.CTkFont(size=12, family="Arial"),
            text_color="#7A8FA3"
        )
        subtitle.pack(pady=(0, 20))
        
        # Form frame
        form_frame = ctk.CTkFrame(main_frame, fg_color="#0F1923", corner_radius=10)
        form_frame.pack(fill="x", padx=10, pady=10)
        
        # Riot Name
        ctk.CTkLabel(
            form_frame,
            text="Riot ID (Kullanıcı Adı)",
            font=ctk.CTkFont(size=12, weight="bold", family="Arial"),
            text_color="#FFFFFF",
            anchor="w"
        ).pack(fill="x", padx=20, pady=(20, 5))
        
        riot_name_entry = ctk.CTkEntry(
            form_frame,
            placeholder_text="yefeblgn",
            font=ctk.CTkFont(size=13, family="Arial"),
            height=35,
            fg_color="#1A2634",
            border_color="#2F3A4F"
        )
        riot_name_entry.pack(fill="x", padx=20, pady=(0, 15))
        
        # Riot Tag
        ctk.CTkLabel(
            form_frame,
            text="Riot Tag (# olmadan)",
            font=ctk.CTkFont(size=12, weight="bold", family="Arial"),
            text_color="#FFFFFF",
            anchor="w"
        ).pack(fill="x", padx=20, pady=(0, 5))
        
        riot_tag_entry = ctk.CTkEntry(
            form_frame,
            placeholder_text="TR1",
            font=ctk.CTkFont(size=13, family="Arial"),
            height=35,
            fg_color="#1A2634",
            border_color="#2F3A4F"
        )
        riot_tag_entry.pack(fill="x", padx=20, pady=(0, 15))
        
        # Region
        ctk.CTkLabel(
            form_frame,
            text="Bölge",
            font=ctk.CTkFont(size=12, weight="bold", family="Arial"),
            text_color="#FFFFFF",
            anchor="w"
        ).pack(fill="x", padx=20, pady=(0, 5))
        
        region_var = ctk.StringVar(value="eu")
        region_menu = ctk.CTkOptionMenu(
            form_frame,
            values=["eu", "na", "ap", "kr", "latam", "br"],
            variable=region_var,
            font=ctk.CTkFont(size=13, family="Arial"),
            height=35,
            fg_color="#1A2634",
            button_color="#2F3A4F",
            button_hover_color="#3F4A5F"
        )
        region_menu.pack(fill="x", padx=20, pady=(0, 15))
        
        # Henrik API - Opsiyonel
        ctk.CTkLabel(
            form_frame,
            text="Henrik API Key (Opsiyonel)",
            font=ctk.CTkFont(size=12, weight="bold", family="Arial"),
            text_color="#FFFFFF",
            anchor="w"
        ).pack(fill="x", padx=20, pady=(0, 5))
        
        henrik_info = ctk.CTkLabel(
            form_frame,
            text="⚠️ API key olmadan rank ve profil bilgileri gösterilmeyebilir",
            font=ctk.CTkFont(size=10, family="Arial"),
            text_color="#FF9800",
            anchor="w"
        )
        henrik_info.pack(fill="x", padx=20, pady=(0, 5))
        
        henrik_entry = ctk.CTkEntry(
            form_frame,
            placeholder_text="HDEV-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            font=ctk.CTkFont(size=11, family="Arial"),
            height=35,
            fg_color="#1A2634",
            border_color="#2F3A4F"
        )
        henrik_entry.pack(fill="x", padx=20, pady=(0, 10))
        
        # Henrik API link
        henrik_link = ctk.CTkLabel(
            form_frame,
            text="🔗 API key almak için: henrikdev.xyz",
            font=ctk.CTkFont(size=10, family="Arial"),
            text_color="#4A9EFF",
            cursor="hand2"
        )
        henrik_link.pack(padx=20, pady=(0, 20))
        henrik_link.bind("<Button-1>", lambda e: webbrowser.open("https://henrikdev.xyz/"))
        
        # Kaydet butonu
        def save_config():
            riot_name = riot_name_entry.get().strip()
            riot_tag = riot_tag_entry.get().strip()
            region = region_var.get()
            henrik_key = henrik_entry.get().strip()
            
            if not riot_name or not riot_tag:
                error_label.configure(text="❌ Lütfen Riot ID ve Tag'inizi girin!", text_color="#FF4654")
                return
            
            # Config'i güncelle
            self.config.riot_name = riot_name
            self.config.riot_tag = riot_tag
            self.config.region = region
            self.config.henrik_api_key = henrik_key
            self.config.save()
            
            # RPC bileşenlerini başlat
            self.init_rpc_components()
            
            # Player bilgilerini güncelle
            self.after(100, lambda: self.update_player_info(
                riot_name, riot_tag, 0, "", None, None
            ))
            
            # Sürüm kontrolü
            threading.Thread(target=self.check_for_updates, daemon=True).start()
            
            # Otomatik başlat
            self.after(500, self.auto_start)
            
            dialog.destroy()
        
        error_label = ctk.CTkLabel(
            main_frame,
            text="",
            font=ctk.CTkFont(size=11, family="Arial"),
            text_color="#FF4654"
        )
        error_label.pack(pady=(5, 10))
        
        save_button = ctk.CTkButton(
            main_frame,
            text="💾 Kaydet ve Başla",
            font=ctk.CTkFont(size=14, weight="bold", family="Arial"),
            fg_color="#FF4654",
            hover_color="#E63946",
            height=45,
            corner_radius=8,
            command=save_config
        )
        save_button.pack(fill="x", padx=10, pady=(0, 10))
    
    def show_settings_dialog(self):
        """Ayarlar dialog'u"""
        dialog = ctk.CTkToplevel(self)
        dialog.title("Ayarlar - Valorant RPC")
        dialog.geometry("500x700")
        dialog.resizable(False, False)
        dialog.transient(self)
        dialog.grab_set()
        
        # Icon ayarla
        try:
            dialog.iconbitmap("assets/game_icon_white.ico")
        except:
            pass
        
        # Dialog'u ortala
        dialog.update_idletasks()
        x = (dialog.winfo_screenwidth() // 2) - (500 // 2)
        y = (dialog.winfo_screenheight() // 2) - (700 // 2)
        dialog.geometry(f'500x700+{x}+{y}')
        
        # Ana frame
        main_frame = ctk.CTkFrame(dialog, fg_color="#1A2029")
        main_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        # Header
        header = ctk.CTkLabel(
            main_frame,
            text="⚙️ Ayarlar",
            font=ctk.CTkFont(size=20, weight="bold", family="Arial"),
            text_color="#FF4654"
        )
        header.pack(pady=(10, 20))
        
        # Scrollable form frame
        form_frame = ctk.CTkScrollableFrame(
            main_frame, 
            fg_color="#0F1923", 
            corner_radius=10,
            height=420
        )
        form_frame.pack(fill="x", padx=10, pady=10)
        
        # Riot Name
        ctk.CTkLabel(
            form_frame,
            text="Riot ID (Kullanıcı Adı)",
            font=ctk.CTkFont(size=12, weight="bold", family="Arial"),
            text_color="#FFFFFF",
            anchor="w"
        ).pack(fill="x", padx=20, pady=(10, 5))
        
        riot_name_entry = ctk.CTkEntry(
            form_frame,
            placeholder_text="yefeblgn",
            font=ctk.CTkFont(size=13, family="Arial"),
            height=35,
            fg_color="#1A2634",
            border_color="#2F3A4F"
        )
        riot_name_entry.insert(0, self.config.riot_name)
        riot_name_entry.pack(fill="x", padx=20, pady=(0, 15))
        
        # Riot Tag
        ctk.CTkLabel(
            form_frame,
            text="Riot Tag (# olmadan)",
            font=ctk.CTkFont(size=12, weight="bold", family="Arial"),
            text_color="#FFFFFF",
            anchor="w"
        ).pack(fill="x", padx=20, pady=(0, 5))
        
        riot_tag_entry = ctk.CTkEntry(
            form_frame,
            placeholder_text="TR1",
            font=ctk.CTkFont(size=13, family="Arial"),
            height=35,
            fg_color="#1A2634",
            border_color="#2F3A4F"
        )
        riot_tag_entry.insert(0, self.config.riot_tag)
        riot_tag_entry.pack(fill="x", padx=20, pady=(0, 15))
        
        # Region
        ctk.CTkLabel(
            form_frame,
            text="Bölge",
            font=ctk.CTkFont(size=12, weight="bold", family="Arial"),
            text_color="#FFFFFF",
            anchor="w"
        ).pack(fill="x", padx=20, pady=(0, 5))
        
        region_var = ctk.StringVar(value=self.config.region)
        region_menu = ctk.CTkOptionMenu(
            form_frame,
            values=["eu", "na", "ap", "kr", "latam", "br"],
            variable=region_var,
            font=ctk.CTkFont(size=13, family="Arial"),
            height=35,
            fg_color="#1A2634",
            button_color="#2F3A4F",
            button_hover_color="#3F4A5F"
        )
        region_menu.pack(fill="x", padx=20, pady=(0, 15))
        
        # Henrik API - Opsiyonel
        henrik_label = ctk.CTkLabel(
            form_frame,
            text="Henrik API Key (Opsiyonel)",
            font=ctk.CTkFont(size=12, weight="bold", family="Arial"),
            text_color="#FFFFFF",
            anchor="w"
        )
        henrik_label.pack(fill="x", padx=20, pady=(0, 5))
        
        # Tooltip - Henrik API olmadan ne olur
        henrik_tooltip_frame = ctk.CTkFrame(form_frame, fg_color="#252F3F", corner_radius=6)
        henrik_tooltip_frame.pack(fill="x", padx=20, pady=(0, 5))
        
        tooltip_icon = ctk.CTkLabel(
            henrik_tooltip_frame,
            text="💡",
            font=ctk.CTkFont(size=14),
        )
        tooltip_icon.pack(side="left", padx=(10, 5), pady=8)
        
        tooltip_text = ctk.CTkLabel(
            henrik_tooltip_frame,
            text="API key olmadan:\n• Rank bilgisi gösterilmez\n• Profil kartı yüklenmez\n• Seviye bilgisi alınamaz",
            font=ctk.CTkFont(size=10, family="Arial"),
            text_color="#FFB020",
            anchor="w",
            justify="left"
        )
        tooltip_text.pack(side="left", padx=(0, 10), pady=8)
        
        henrik_entry = ctk.CTkEntry(
            form_frame,
            placeholder_text="HDEV-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            font=ctk.CTkFont(size=11, family="Arial"),
            height=35,
            fg_color="#1A2634",
            border_color="#2F3A4F"
        )
        henrik_entry.insert(0, self.config.henrik_api_key)
        henrik_entry.pack(fill="x", padx=20, pady=(0, 10))
        
        # Henrik API link
        henrik_link = ctk.CTkLabel(
            form_frame,
            text="🔗 API key almak için: henrikdev.xyz",
            font=ctk.CTkFont(size=10, family="Arial"),
            text_color="#4A9EFF",
            cursor="hand2"
        )
        henrik_link.pack(padx=20, pady=(0, 20))
        henrik_link.bind("<Button-1>", lambda e: webbrowser.open("https://henrikdev.xyz/"))
        
        # Divider
        ctk.CTkFrame(form_frame, height=2, fg_color="#2F3A4F").pack(fill="x", padx=20, pady=15)
        
        # Görünüm ayarları
        ctk.CTkLabel(
            form_frame,
            text="Görünüm Ayarları",
            font=ctk.CTkFont(size=12, weight="bold", family="Arial"),
            text_color="#FFFFFF",
            anchor="w"
        ).pack(fill="x", padx=20, pady=(0, 10))
        
        # Show Rank
        show_rank_var = ctk.BooleanVar(value=self.config.show_rank)
        show_rank_check = ctk.CTkCheckBox(
            form_frame,
            text="Rank bilgisi göster",
            variable=show_rank_var,
            font=ctk.CTkFont(size=11, family="Arial"),
            fg_color="#FF4654",
            hover_color="#E63946"
        )
        show_rank_check.pack(fill="x", padx=20, pady=5)
        
        # Show Level
        show_level_var = ctk.BooleanVar(value=self.config.show_level)
        show_level_check = ctk.CTkCheckBox(
            form_frame,
            text="Seviye bilgisi göster",
            variable=show_level_var,
            font=ctk.CTkFont(size=11, family="Arial"),
            fg_color="#FF4654",
            hover_color="#E63946"
        )
        show_level_check.pack(fill="x", padx=20, pady=5)
        
        # Show Party Size
        show_party_var = ctk.BooleanVar(value=self.config.show_party_size)
        show_party_check = ctk.CTkCheckBox(
            form_frame,
            text="Parti bilgisi göster",
            variable=show_party_var,
            font=ctk.CTkFont(size=11, family="Arial"),
            fg_color="#FF4654",
            hover_color="#E63946"
        )
        show_party_check.pack(fill="x", padx=20, pady=5)
        
        # Kaydet butonu
        def save_settings():
            riot_name = riot_name_entry.get().strip()
            riot_tag = riot_tag_entry.get().strip()
            region = region_var.get()
            henrik_key = henrik_entry.get().strip()
            
            if not riot_name or not riot_tag:
                error_label.configure(text="❌ Lütfen Riot ID ve Tag'inizi girin!", text_color="#FF4654")
                return
            
            # Config'i güncelle
            old_region = self.config.region
            self.config.riot_name = riot_name
            self.config.riot_tag = riot_tag
            self.config.region = region
            self.config.henrik_api_key = henrik_key
            self.config.show_rank = show_rank_var.get()
            self.config.show_level = show_level_var.get()
            self.config.show_party_size = show_party_var.get()
            self.config.save()
            
            # Bölge değiştiyse client'ı yeniden başlat
            if old_region != region:
                self.stop_rpc()
                self.init_rpc_components()
            
            success_label.configure(text="✅ Ayarlar kaydedildi!", text_color="#00E676")
            self.after(2000, dialog.destroy)
        
        error_label = ctk.CTkLabel(
            main_frame,
            text="",
            font=ctk.CTkFont(size=11, family="Arial"),
            text_color="#FF4654"
        )
        error_label.pack(pady=(5, 0))
        
        success_label = ctk.CTkLabel(
            main_frame,
            text="",
            font=ctk.CTkFont(size=11, family="Arial"),
            text_color="#00E676"
        )
        success_label.pack(pady=(0, 10))
        
        button_frame = ctk.CTkFrame(main_frame, fg_color="transparent")
        button_frame.pack(fill="x", padx=10, pady=(0, 10))
        
        cancel_button = ctk.CTkButton(
            button_frame,
            text="❌ İptal",
            font=ctk.CTkFont(size=13, weight="bold", family="Arial"),
            fg_color="#5A6A7A",
            hover_color="#4A5A6A",
            height=40,
            corner_radius=8,
            command=dialog.destroy
        )
        cancel_button.pack(side="left", fill="x", expand=True, padx=(0, 5))
        
        save_button = ctk.CTkButton(
            button_frame,
            text="💾 Kaydet",
            font=ctk.CTkFont(size=13, weight="bold", family="Arial"),
            fg_color="#FF4654",
            hover_color="#E63946",
            height=40,
            corner_radius=8,
            command=save_settings
        )
        save_button.pack(side="right", fill="x", expand=True, padx=(5, 0))
    
    def setup_logging(self):
        """Logging ayarları"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            datefmt='%H:%M:%S'
        )
        self.logger = logging.getLogger(__name__)
    
    def create_ui(self):
        """Premium UI oluştur"""
        
        # Sol sidebar - Gradient effect için iki frame
        sidebar = ctk.CTkFrame(self, width=280, fg_color="#0F1923", corner_radius=0)
        sidebar.pack(side="left", fill="y")
        sidebar.pack_propagate(False)
        
        # Logo section - Daha büyük ve etkileyici
        logo_section = ctk.CTkFrame(sidebar, fg_color="transparent")
        logo_section.pack(pady=20, padx=20)
        
        # Valorant logo container with glow effect
        logo_container = ctk.CTkFrame(logo_section, fg_color="transparent")
        logo_container.pack()
        
        logo_title = ctk.CTkLabel(
            logo_container,
            text="VALORANT",
            font=ctk.CTkFont(size=24, weight="bold", family="Arial"),
            text_color="#FF4654"
        )
        logo_title.pack()
        
        logo_subtitle = ctk.CTkLabel(
            logo_container,
            text="RICH PRESENCE",
            font=ctk.CTkFont(size=10, weight="bold", family="Arial"),
            text_color="#7A8FA3"
        )
        logo_subtitle.pack(pady=(3, 0))
        
        # Ayarlar butonu
        settings_button = ctk.CTkButton(
            logo_section,
            text="⚙️ Ayarlar",
            font=ctk.CTkFont(size=11, weight="bold", family="Arial"),
            fg_color="#252F3F",
            hover_color="#2F3A4F",
            corner_radius=6,
            height=28,
            command=self.show_settings_dialog
        )
        settings_button.pack(pady=(8, 0))
        
        # Player card section - Premium Valorant style
        self.player_section = ctk.CTkFrame(
            sidebar, 
            fg_color="#0F1923",
            corner_radius=0,
            border_width=0
        )
        self.player_section.pack(fill="x", padx=0, pady=(0, 12))
        
        # Banner background - large card
        self.banner_frame = ctk.CTkFrame(
            self.player_section,
            fg_color="#1A2634",
            corner_radius=0,
            height=140
        )
        self.banner_frame.pack(fill="x")
        self.banner_frame.pack_propagate(False)
        
        # Banner image
        self.banner_label = ctk.CTkLabel(
            self.banner_frame,
            text="",
            fg_color="transparent"
        )
        self.banner_label.pack(fill="both", expand=True)
        
        # Bottom info section with gradient
        info_section = ctk.CTkFrame(
            self.player_section,
            fg_color="#0D1520",
            corner_radius=0,
            height=70
        )
        info_section.pack(fill="x")
        info_section.pack_propagate(False)
        
        # Info container
        info_container = ctk.CTkFrame(info_section, fg_color="transparent")
        info_container.pack(expand=True, fill="both", padx=15, pady=10)
        
        # Top: Player name - large and centered
        name_frame = ctk.CTkFrame(info_container, fg_color="transparent")
        name_frame.pack(fill="x")
        
        self.player_name_label = ctk.CTkLabel(
            name_frame,
            text="Bağlanıyor...",
            font=ctk.CTkFont(size=15, weight="bold", family="Arial"),
            text_color="#FFFFFF",
            anchor="center"
        )
        self.player_name_label.pack(expand=True)
        
        # Bottom: Stats row with icons
        stats_frame = ctk.CTkFrame(info_container, fg_color="transparent")
        stats_frame.pack(pady=(5, 0))
        
        # Level badge with icon
        level_container = ctk.CTkFrame(stats_frame, fg_color="#1A2634", corner_radius=6)
        level_container.pack(side="left", padx=3)
        
        level_content = ctk.CTkFrame(level_container, fg_color="transparent")
        level_content.pack(padx=8, pady=3)
        
        self.player_level_label = ctk.CTkLabel(
            level_content,
            text="",
            font=ctk.CTkFont(size=10, weight="bold", family="Arial"),
            text_color="#00E676"
        )
        self.player_level_label.pack()
        
        # Rank badge with better styling
        rank_container = ctk.CTkFrame(stats_frame, fg_color="#252F3F", corner_radius=6)
        rank_container.pack(side="left", padx=3)
        
        rank_content = ctk.CTkFrame(rank_container, fg_color="transparent")
        rank_content.pack(padx=10, pady=4)
        
        # Rank icon (will be loaded)
        self.rank_icon_label = ctk.CTkLabel(
            rank_content,
            text="",
            fg_color="transparent"
        )
        self.rank_icon_label.pack(side="left", padx=(0, 6))
        
        self.player_rank_label = ctk.CTkLabel(
            rank_content,
            text="",
            font=ctk.CTkFont(size=11, weight="bold", family="Arial"),
            text_color="#FFC850"
        )
        self.player_rank_label.pack(side="left")
        
        # Status section
        status_header = ctk.CTkFrame(sidebar, fg_color="transparent")
        status_header.pack(fill="x", padx=20, pady=(5, 10))
        
        ctk.CTkLabel(
            status_header,
            text="BAĞLANTI DURUMU",
            font=ctk.CTkFont(size=10, weight="bold", family="Arial"),
            text_color="#5A6A7A"
        ).pack()
        
        # Status cards
        self.create_status_card(sidebar, "discord")
        self.create_status_card(sidebar, "valorant")
        
        # Spacer - minimal space
        ctk.CTkFrame(sidebar, fg_color="transparent", height=10).pack()
        
        # Control button - BURADA, görünür yerde!
        button_container = ctk.CTkFrame(sidebar, fg_color="transparent")
        button_container.pack(fill="x", padx=20, pady=10)
        
        self.start_button = ctk.CTkButton(
            button_container,
            text="▶  BAŞLAT",
            font=ctk.CTkFont(size=16, weight="bold", family="Arial"),
            height=50,
            corner_radius=10,
            fg_color="#FF4654",
            hover_color="#E63946",
            text_color="#FFFFFF",
            border_width=0,
            command=self.toggle_rpc
        )
        self.start_button.pack(fill="x")
        
        # Minimal spacer
        ctk.CTkFrame(sidebar, fg_color="transparent", height=5).pack()
        
        # Footer - daha yukarıda
        footer = ctk.CTkFrame(sidebar, fg_color="transparent")
        footer.pack(fill="x")
        
        # GitHub link
        github_label = ctk.CTkLabel(
            footer,
            text="github.com/yefeblgn",
            font=ctk.CTkFont(size=10, weight="bold", family="Arial"),
            text_color="#7A8FA3",
            cursor="hand2"
        )
        github_label.pack(pady=(0, 2))
        github_label.bind("<Button-1>", lambda e: self.open_github())
        
        ctk.CTkLabel(
            footer,
            text="made with ❤ by yefeblgn",
            font=ctk.CTkFont(size=9, family="Arial"),
            text_color="#5A6A7A"
        ).pack()
        
        # Versiyon bilgisi
        self.version_label = ctk.CTkLabel(
            footer,
            text=f"v{self.current_version}",
            font=ctk.CTkFont(size=8, family="Arial"),
            text_color="#3A4A5A"
        )
        self.version_label.pack(pady=(2, 0))
        
        # Spacer - en sonda
        spacer = ctk.CTkFrame(sidebar, fg_color="transparent")
        spacer.pack(fill="both", expand=True)
        
        # Sağ ana panel
        main_panel = ctk.CTkFrame(self, fg_color="#1A2029", corner_radius=0)
        main_panel.pack(side="right", fill="both", expand=True)
        
        # Header - Daha göz alıcı
        header = ctk.CTkFrame(main_panel, height=75, fg_color="#141920", corner_radius=0)
        header.pack(fill="x")
        header.pack_propagate(False)
        
        header_content = ctk.CTkFrame(header, fg_color="transparent")
        header_content.pack(fill="both", expand=True, padx=30, pady=15)
        
        # Header title with icon
        title_frame = ctk.CTkFrame(header_content, fg_color="transparent")
        title_frame.pack(side="left")
        
        ctk.CTkLabel(
            title_frame,
            text="⚡",
            font=ctk.CTkFont(size=22),
            text_color="#FF4654"
        ).pack(side="left", padx=(0, 10))
        
        title_text = ctk.CTkFrame(title_frame, fg_color="transparent")
        title_text.pack(side="left")
        
        ctk.CTkLabel(
            title_text,
            text="AKTİVİTE",
            font=ctk.CTkFont(size=20, weight="bold", family="Arial"),
            text_color="#ECE8E1"
        ).pack(anchor="w")
        
        ctk.CTkLabel(
            title_text,
            text="Canlı İzleme Panosu",
            font=ctk.CTkFont(size=10, family="Arial"),
            text_color="#5A6A7A"
        ).pack(anchor="w")
        
        # Stats cards in header - Daha şık
        stats_frame = ctk.CTkFrame(header_content, fg_color="transparent")
        stats_frame.pack(side="right")
        
        # Uptime card
        uptime_card = ctk.CTkFrame(
            stats_frame, 
            fg_color="#1F2933",
            corner_radius=8,
            border_width=1,
            border_color="#2A3644"
        )
        uptime_card.pack(side="left", padx=6)
        
        uptime_content = ctk.CTkFrame(uptime_card, fg_color="transparent")
        uptime_content.pack(padx=15, pady=10)
        
        ctk.CTkLabel(
            uptime_content,
            text="ÇALIŞMA SÜRESİ",
            font=ctk.CTkFont(size=9, weight="bold", family="Arial"),
            text_color="#5A6A7A"
        ).pack()
        
        self.uptime_label = ctk.CTkLabel(
            uptime_content,
            text="00:00:00",
            font=ctk.CTkFont(size=16, weight="bold", family="Arial"),
            text_color="#00E676"
        )
        self.uptime_label.pack(pady=(3, 0))
        
        # Updates card
        updates_card = ctk.CTkFrame(
            stats_frame,
            fg_color="#1F2933",
            corner_radius=8,
            border_width=1,
            border_color="#2A3644"
        )
        updates_card.pack(side="left", padx=6)
        
        updates_content = ctk.CTkFrame(updates_card, fg_color="transparent")
        updates_content.pack(padx=15, pady=10)
        
        ctk.CTkLabel(
            updates_content,
            text="GÜNCELLEME",
            font=ctk.CTkFont(size=9, weight="bold", family="Arial"),
            text_color="#5A6A7A"
        ).pack()
        
        self.updates_label = ctk.CTkLabel(
            updates_content,
            text="0",
            font=ctk.CTkFont(size=16, weight="bold", family="Arial"),
            text_color="#FFB020"
        )
        self.updates_label.pack(pady=(3, 0))
        
        # Main content
        content = ctk.CTkFrame(main_panel, fg_color="transparent")
        content.pack(fill="both", expand=True, padx=30, pady=20)
        
        # Current status card - Büyük ve görsel
        status_header = ctk.CTkFrame(content, fg_color="transparent")
        status_header.pack(fill="x", pady=(0, 12))
        
        ctk.CTkLabel(
            status_header,
            text="ŞU ANKİ DURUM",
            font=ctk.CTkFont(size=11, weight="bold", family="Arial"),
            text_color="#5A6A7A"
        ).pack(side="left")
        
        # Current status display - Gradient effect
        self.status_card = ctk.CTkFrame(
            content,
            fg_color="#141920",
            corner_radius=12,
            height=110,
            border_width=2,
            border_color="#1F2933"
        )
        self.status_card.pack(fill="x", pady=(0, 20))
        self.status_card.pack_propagate(False)
        
        status_content = ctk.CTkFrame(self.status_card, fg_color="transparent")
        status_content.pack(fill="both", expand=True, padx=25, pady=20)
        
        # Status icon + text
        status_top = ctk.CTkFrame(status_content, fg_color="transparent")
        status_top.pack(fill="x")
        
        self.status_icon = ctk.CTkLabel(
            status_top,
            text="●",
            font=ctk.CTkFont(size=20),
            text_color="#7A8FA3"
        )
        self.status_icon.pack(side="left", padx=(0, 10))
        
        status_text_frame = ctk.CTkFrame(status_top, fg_color="transparent")
        status_text_frame.pack(side="left", fill="x", expand=True)
        
        self.current_status_label = ctk.CTkLabel(
            status_text_frame,
            text="Hazır",
            font=ctk.CTkFont(size=20, weight="bold", family="Arial"),
            text_color="#ECE8E1",
            anchor="w"
        )
        self.current_status_label.pack(anchor="w")
        
        self.current_status_detail = ctk.CTkLabel(
            status_text_frame,
            text="RPC'yi başlatmak için ▶ BAŞLAT butonuna tıklayın",
            font=ctk.CTkFont(size=11, family="Arial"),
            text_color="#7A8FA3",
            anchor="w"
        )
        self.current_status_detail.pack(anchor="w", pady=(5, 0))
        
        # Activity log
        log_header = ctk.CTkFrame(content, fg_color="transparent")
        log_header.pack(fill="x", pady=(0, 12))
        
        ctk.CTkLabel(
            log_header,
            text="AKTİVİTE GÜNLÜĞÜ",
            font=ctk.CTkFont(size=11, weight="bold", family="Arial"),
            text_color="#5A6A7A"
        ).pack(side="left")
        
        # Log container
        log_container = ctk.CTkFrame(
            content,
            fg_color="#141920",
            corner_radius=12,
            border_width=2,
            border_color="#1F2933"
        )
        log_container.pack(fill="both", expand=True)
        
        self.log_text = ctk.CTkTextbox(
            log_container,
            font=ctk.CTkFont(family="Consolas", size=11),
            fg_color="#141920",
            corner_radius=12,
            border_width=0,
            wrap="word"
        )
        self.log_text.pack(fill="both", expand=True, padx=3, pady=3)
        self.log_text.configure(state="disabled")
        
        # Stats
        self.start_time = None
        self.update_count = 0
    
    def create_status_card(self, parent, service_type):
        """Status kartı oluştur - Şık ve modern"""
        card = ctk.CTkFrame(
            parent,
            fg_color="#1A2634",
            corner_radius=8,
            border_width=1,
            border_color="#2A3644"
        )
        card.pack(fill="x", padx=15, pady=4)
        
        content = ctk.CTkFrame(card, fg_color="transparent")
        content.pack(fill="x", padx=15, pady=10)
        
        # Status indicator
        if service_type == "discord":
            self.discord_indicator = ctk.CTkLabel(
                content,
                text="●",
                font=ctk.CTkFont(size=16),
                text_color="#FF4654"
            )
            self.discord_indicator.pack(side="left", padx=(0, 10))
        else:
            self.valorant_indicator = ctk.CTkLabel(
                content,
                text="●",
                font=ctk.CTkFont(size=16),
                text_color="#FF4654"
            )
            self.valorant_indicator.pack(side="left", padx=(0, 10))
        
        # Info
        info_frame = ctk.CTkFrame(content, fg_color="transparent")
        info_frame.pack(side="left", fill="x", expand=True)
        
        service_name = "Discord" if service_type == "discord" else "Valorant"
        
        title = ctk.CTkLabel(
            info_frame,
            text=service_name.upper(),
            font=ctk.CTkFont(size=13, weight="bold", family="Arial"),
            text_color="#ECE8E1"
        )
        title.pack(anchor="w")
        
        if service_type == "discord":
            self.discord_status_text = ctk.CTkLabel(
                info_frame,
                text="Bağlantı bekleniyor",
                font=ctk.CTkFont(size=10, weight="bold", family="Arial"),
                text_color="#7A8FA3"
            )
            self.discord_status_text.pack(anchor="w", pady=(4, 0))
        else:
            self.valorant_status_text = ctk.CTkLabel(
                info_frame,
                text="Bağlantı bekleniyor",
                font=ctk.CTkFont(size=10, weight="bold", family="Arial"),
                text_color="#7A8FA3"
            )
            self.valorant_status_text.pack(anchor="w", pady=(4, 0))
    
    def update_player_info(self, name: str, tag: str, level: int, rank_text: str = "", card_url: str = "", rank_icon: str = ""):
        """Oyuncu bilgilerini güncelle"""
        self.player_name_label.configure(text=f"{name}#{tag}")
        self.player_level_label.configure(text=f"LVL {level}")
        
        # Rank varsa göster
        if rank_text and rank_text != "":
            self.player_rank_label.configure(text=rank_text)
            # Rank icon yükle
            if rank_icon and rank_icon:
                threading.Thread(target=self.load_rank_icon, args=(rank_icon,), daemon=True).start()
            else:
                self.rank_icon_label.configure(image="", text="")
        else:
            # Rank yok - gizle
            self.player_rank_label.configure(text="")
            self.rank_icon_label.configure(image="", text="")
        
        # Banner yükle
        if card_url:
            threading.Thread(target=self.load_banner, args=(card_url,), daemon=True).start()
    
    def load_banner(self, url: str):
        """Banner resmini yükle - oval vignette efekti ile"""
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                from PIL import ImageEnhance, ImageFilter, ImageDraw
                
                img = Image.open(BytesIO(response.content))
                
                # Resize to fit (küçük padding için biraz daha küçük)
                img = img.resize((260, 130), Image.Resampling.LANCZOS)
                
                # Enhance image
                # Sharpen
                img = img.filter(ImageFilter.SHARPEN)
                
                # Contrast
                contrast = ImageEnhance.Contrast(img)
                img = contrast.enhance(1.15)
                
                # Brightness - daha parlak
                brightness = ImageEnhance.Brightness(img)
                img = brightness.enhance(0.6)
                
                # Color boost
                color = ImageEnhance.Color(img)
                img = color.enhance(1.2)
                
                # Oval vignette mask oluştur
                mask = Image.new('L', (260, 130), 0)
                draw = ImageDraw.Draw(mask)
                
                # Oval gradient vignette
                for i in range(40):
                    alpha = int(255 * (i / 40))
                    draw.ellipse([i, i, 260-i, 130-i], fill=alpha)
                
                # Final oval mask
                draw.ellipse([20, 15, 240, 115], fill=255)
                
                # Apply mask - fade to black at edges
                black_bg = Image.new('RGB', (260, 130), (10, 15, 25))
                img = Image.composite(img, black_bg, mask)
                
                # Padding ekleyerek merkeze al (280x140)
                final_img = Image.new('RGB', (280, 140), (26, 38, 52))  # #1A2634
                final_img.paste(img, (10, 5))
                
                photo = ImageTk.PhotoImage(final_img)
                
                # Update in main thread
                self.after(0, lambda: self.update_banner_image(photo))
        except Exception as e:
            self.logger.error(f"Banner yüklenemedi: {e}")
    
    def update_banner_image(self, photo):
        """Banner resmini güncelle"""
        self.banner_label.configure(image=photo)
        self.banner_label.image = photo  # Keep a reference
    
    def load_rank_icon(self, url: str):
        """Rank icon'unu yükle"""
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                img = Image.open(BytesIO(response.content))
                # Larger icon for better visibility
                img = img.resize((24, 24), Image.Resampling.LANCZOS)
                
                # Enhance icon visibility
                from PIL import ImageEnhance
                enhancer = ImageEnhance.Brightness(img)
                img = enhancer.enhance(1.1)
                enhancer = ImageEnhance.Contrast(img)
                img = enhancer.enhance(1.2)
                
                photo = ImageTk.PhotoImage(img)
                
                # Update in main thread
                self.after(0, lambda: self.update_rank_icon(photo))
        except Exception as e:
            self.logger.error(f"Rank icon yüklenemedi: {e}")
    
    def update_rank_icon(self, photo):
        """Rank icon'unu güncelle"""
        self.rank_icon_label.configure(image=photo, text="")
        self.rank_icon_label.image = photo  # Keep a reference
    
    def update_current_status(self, status: str, detail: str = "", status_type: str = "info"):
        """Şu anki durumu güncelle"""
        self.current_status_label.configure(text=status)
        if detail:
            self.current_status_detail.configure(text=detail)
        
        # Status icon color
        colors = {
            "info": "#7A8FA3",
            "active": "#00E676",
            "warning": "#FFB020",
            "error": "#FF4654"
        }
        self.status_icon.configure(text_color=colors.get(status_type, "#7A8FA3"))
    
    def update_stats(self):
        """İstatistikleri güncelle"""
        if self.start_time and self.running:
            elapsed = int(time.time() - self.start_time)
            hours = elapsed // 3600
            minutes = (elapsed % 3600) // 60
            seconds = elapsed % 60
            self.uptime_label.configure(text=f"{hours:02d}:{minutes:02d}:{seconds:02d}")
            
            self.updates_label.configure(text=str(self.update_count))
            
            # Tekrar çağır
            self.after(1000, self.update_stats)
    
    def log_message(self, message: str, level: str = "INFO"):
        """Log mesajı ekle"""
        self.log_text.configure(state="normal")
        timestamp = time.strftime("%H:%M:%S")
        
        colors = {
            "INFO": "#7A8FA3",
            "SUCCESS": "#00E676",
            "ERROR": "#FF4654",
            "WARNING": "#FFB020"
        }
        color = colors.get(level, "#ECE8E1")
        
        icons = {
            "INFO": "ℹ",
            "SUCCESS": "✓",
            "ERROR": "✗",
            "WARNING": "⚠"
        }
        icon = icons.get(level, "•")
        
        self.log_text.insert("end", f"[{timestamp}] ", ("timestamp",))
        self.log_text.insert("end", f"{icon} ", ("icon",))
        self.log_text.insert("end", f"{message}\n", ("message",))
        self.log_text.tag_config("timestamp", foreground="#5A6A7A")
        self.log_text.tag_config("icon", foreground=color)
        self.log_text.tag_config("message", foreground=color)
        
        self.log_text.see("end")
        self.log_text.configure(state="disabled")
    
    def update_discord_status(self, connected: bool):
        """Discord durumunu güncelle"""
        self.connected_discord = connected
        if connected:
            self.discord_indicator.configure(text_color="#00E676")
            self.discord_status_text.configure(text="Aktif Bağlantı ✓", text_color="#00E676")
        else:
            self.discord_indicator.configure(text_color="#FF4654")
            self.discord_status_text.configure(text="Bağlantı bekleniyor", text_color="#7A8FA3")
    
    def update_valorant_status(self, connected: bool):
        """Valorant durumunu güncelle"""
        self.connected_valorant = connected
        if connected:
            self.valorant_indicator.configure(text_color="#00E676")
            self.valorant_status_text.configure(text="Aktif Bağlantı ✓", text_color="#00E676")
        else:
            self.valorant_indicator.configure(text_color="#FF4654")
            self.valorant_status_text.configure(text="Bağlantı bekleniyor", text_color="#7A8FA3")
    
    def toggle_rpc(self):
        """RPC başlat/durdur veya güncelleme sayfasına git"""
        # Güncelleme varsa GitHub'a yönlendir
        if self.update_available and not self.running:
            self.logger.info(f"📦 Güncelleme sayfasına yönlendiriliyor... (v{self.latest_version})")
            webbrowser.open(GITHUB_REPO_URL)
            return
        
        if not self.running:
            self.start_rpc()
        else:
            self.stop_rpc()
    
    def start_rpc(self):
        """RPC başlat"""
        self.running = True
        self.start_time = time.time()
        self.update_count = 0
        self.start_button.configure(
            text="■  DURDUR",
            fg_color="#5A6A7A",
            hover_color="#4A5A6A"
        )
        self.status_icon.configure(text_color="#FFB020")
        
        self.log_message("RPC başlatılıyor...", "INFO")
        self.update_current_status("⏳ Başlatılıyor", "Discord ve Valorant'a bağlanılıyor...", "warning")
        
        # Stats güncellemeyi başlat
        self.update_stats()
        
        # Thread'de çalıştır
        self.rpc_thread = threading.Thread(target=self.rpc_worker, daemon=True)
        self.rpc_thread.start()
    
    def stop_rpc(self):
        """RPC durdur"""
        self.running = False
        self.start_button.configure(
            text="▶  BAŞLAT",
            fg_color="#FF4654",
            hover_color="#E63946"
        )
        self.status_icon.configure(text_color="#7A8FA3")
        
        self.log_message("RPC durduruluyor...", "WARNING")
        self.update_current_status("Durdu", "RPC durduruldu")
        
        if self.client:
            self.client.close()
        if self.rpc:
            self.rpc.close()
        
        self.update_discord_status(False)
        self.update_valorant_status(False)
        
        self.log_message("RPC durduruldu", "INFO")
    
    def rpc_worker(self):
        """RPC çalışma thread'i"""
        try:
            # Discord bağlantısı - açık değilse bekle
            self.log_message("Discord kontrol ediliyor...", "INFO")
            self.update_current_status("⏳ Bekleniyor", "Discord açılması bekleniyor...", "warning")
            
            while self.running and not self.rpc.connect():
                self.log_message("Discord açık değil, 5 saniye bekleniyor...", "WARNING")
                time.sleep(5)
            
            if not self.running:
                return
            
            self.update_discord_status(True)
            self.log_message("Discord bağlantısı başarılı!", "SUCCESS")
            
            # Valorant bağlantısı
            self.log_message("Valorant bekleniyor...", "INFO")
            self.update_current_status("⏳ Bekleniyor", "Valorant açılması bekleniyor...", "warning")
            
            while self.running and not self.client.connect():
                self.log_message("Valorant açık değil, 5 saniye bekleniyor...", "WARNING")
                time.sleep(5)
            
            if not self.running:
                return
            
            self.update_valorant_status(True)
            self.log_message("Valorant bağlantısı başarılı!", "SUCCESS")
            
            # Oyuncu bilgilerini al
            player_name = self.client.cache.get('player_name', 'Player')
            player_tag = self.client.cache.get('player_tag', '0000')
            player_level = self.client.cache.get('level', 0)
            rank_text = self.client.cache.get('rank_text', '')
            card_small = self.client.cache.get('card_small', '')
            rank_icon = self.client.cache.get('rank_icon', '')
            
            self.update_player_info(player_name, player_tag, player_level, rank_text, card_small, rank_icon)
            
            self.log_message("RPC aktif!", "SUCCESS")
            self.update_current_status("⚡ Aktif", "Discord'da presence güncelleniyor", "active")
            
            last_presence_state = ""
            
            while self.running:
                try:
                    status = self.client.get_full_status()
                    
                    if not status:
                        time.sleep(2)
                        continue
                    
                    # Bilgileri ekle
                    queue_id = status.get('queue_id', '')
                    status['queue_name'] = self.client.get_queue_display_name(queue_id)
                    status['queue_icon'] = self.client.get_queue_icon_url(queue_id)
                    
                    map_path = status.get('match_map', '')
                    status['map_name'] = self.client.get_map_display_name(map_path)
                    status['map_icon'] = self.client.get_map_icon_url(map_path)
                    
                    agent_id = status.get('agent_id', '')
                    agent_name = status.get('agent_name', '')
                    if agent_id:
                        status['agent_icon'] = self.client.get_agent_icon_url(agent_id)
                    if not agent_name and agent_id:
                        status['agent_name'] = self.client.get_agent_display_name(agent_id)
                    
                    # Presence oluştur
                    presence = self.presence_builder.build_presence(status)
                    
                    if presence:
                        current_state = f"{presence.get('details', '')}|{presence.get('small_image', '')}|{presence.get('party_size', [0,0])[0]}"
                        
                        if current_state != last_presence_state:
                            self.rpc.update_presence(presence)
                            last_presence_state = current_state
                            self.update_count += 1
                            
                            details_text = presence.get('details', '')
                            party_info = presence.get('party_size', [0, 0])
                            party_text = f" ({party_info[0]}/{party_info[1]})" if party_info[0] > 0 else ""
                            
                            self.log_message(f"{details_text}{party_text}", "SUCCESS")
                            self.update_current_status("✓ Güncellendi", details_text + party_text, "active")
                    
                    time.sleep(2)
                    
                except Exception as e:
                    self.log_message(f"Hata: {e}", "ERROR")
                    time.sleep(2)
        
        except Exception as e:
            self.log_message(f"Kritik hata: {e}", "ERROR")
            self.running = False
    
    def on_minimize(self, event):
        """Minimize edildiğinde"""
        if self.state() == "iconic":
            if not self.tray_icon:
                self.hide_window()
    
    def hide_window(self):
        """Pencereyi gizle ve tray'e at"""
        self.withdraw()
        self.is_minimized = True
        self.create_tray_icon()
    
    def show_window(self):
        """Pencereyi göster"""
        self.deiconify()
        self.is_minimized = False
        if self.tray_icon:
            self.tray_icon.stop()
            self.tray_icon = None
    
    def create_tray_icon(self):
        """System tray icon oluştur"""
        try:
            # Icon oluştur
            image = Image.open("assets/game_icon_white.ico")
        except:
            # Fallback - basit bir icon
            image = Image.new('RGB', (64, 64), color='red')
        
        # Menu oluştur
        menu = (
            item('Aç', self.show_from_tray),
            item('Çıkış', self.quit_from_tray)
        )
        
        self.tray_icon = pystray.Icon("valorant_rpc", image, "Valorant RPC", menu)
        
        # Tek tıklama ile aç
        def on_left_click(icon, item):
            self.show_from_tray(icon, item)
        
        self.tray_icon.default_action = on_left_click
        
        # Tray'i başlat (thread'de)
        threading.Thread(target=self.tray_icon.run, daemon=True).start()
        
        # Bildirim göster (tray başladıktan sonra)
        time.sleep(0.5)  # Tray'in hazır olması için kısa bekleme
        try:
            # Bildirime tıklanınca pencereyi aç
            self.tray_icon.notify(
                "Valorant RPC",
                "Uygulama arka planda çalışmaya devam ediyor"
            )
            # pystray bildirim tıklaması için default action kullanılır
        except Exception as e:
            self.logger.error(f"Bildirim gönderilemedi: {e}")
    
    def show_from_tray(self, icon=None, item=None):
        """Tray'den aç"""
        self.after(0, self.show_window)
    
    def quit_from_tray(self, icon=None, item=None):
        """Tray'den çık"""
        if self.running:
            self.stop_rpc()
        if self.tray_icon:
            self.tray_icon.stop()
        self.after(0, self.destroy)
    
    def on_closing(self):
        """Pencere kapatılırken"""
        if self.running:
            # Minimize et
            self.hide_window()
        else:
            self.destroy()

def main():
    """Ana fonksiyon"""
    app = ValorantRPCGUI()
    app.mainloop()

if __name__ == "__main__":
    main()
