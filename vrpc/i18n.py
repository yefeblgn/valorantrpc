"""Basit iki dilli (TR/EN) metin tablosu — hem arayüz hem Discord presence metinleri."""

from __future__ import annotations

# valorant-api.com dil kodu eşlemesi (içerik isimlerini yerelleştirmek için).
API_LANGUAGE = {"tr": "tr-TR", "en": "en-US"}

STRINGS: dict[str, dict[str, str]] = {
    "tr": {
        # --- Panel / durum ---
        "app_title": "ValorantRPC",
        "status_idle": "Valorant bekleniyor…",
        "status_connecting": "Bağlanılıyor…",
        "status_menu": "Menüde",
        "status_pregame": "Ajan Seçiliyor",
        "status_ingame": "Maçta",
        "discord_on": "Discord bağlı",
        "discord_off": "Discord bağlı değil",
        "valorant_on": "Valorant bağlı",
        "valorant_off": "Valorant kapalı",
        # --- Etiketler / kontroller ---
        "rpc_enabled": "Rich Presence",
        "language": "Dil",
        "autostart": "Windows ile başlat",
        "show_rank": "Rankı göster",
        "show_level": "Seviyeyi göster",
        "show_party": "Parti boyutunu göster",
        "show_elapsed": "Geçen süreyi göster",
        "autolock_enabled": "Oto-Kilit",
        "custom": "Özel Oyun",
        "select_agent": "Ajan Seç",
        "level": "Seviye",
        "unranked": "Derecesiz",
        "party": "Parti",
        "score": "Skor",
        "map": "Harita",
        "agent": "Ajan",
        "mode": "Mod",
        # --- Butonlar / tray ---
        "github": "GitHub",
        "tray_show": "Paneli Göster",
        "tray_quit": "Çıkış",
        "update_available": "Güncelleme mevcut",
        "no_player": "Oyuncu bilgisi yok",
        "updating": "Güncelleniyor",
        "update_failed": "Güncelleme başarısız. Tekrar dene.",
        "remaining": "kaldı",
        "notification_title": "ValorantRPC Başlatıldı",
        "notification_desc": "Uygulama arka planda çalışıyor. Discord RPC aktif.",
        # --- Presence (Discord'da görünür) ---
        "p_in_menu": "Menüde",
        "p_selecting_agent": "Ajan Seçiliyor",
        "p_pregame_small": "Oyun Öncesi",
        "p_lobby": "Lobide",
        "queuing": "Sırada",
        "p_in_game": "Oyunda",
    },
    "en": {
        "app_title": "ValorantRPC",
        "status_idle": "Waiting for Valorant…",
        "status_connecting": "Connecting…",
        "status_menu": "In Menu",
        "status_pregame": "Selecting Agent",
        "status_ingame": "In Match",
        "discord_on": "Discord connected",
        "discord_off": "Discord disconnected",
        "valorant_on": "Valorant connected",
        "valorant_off": "Valorant closed",
        "rpc_enabled": "Rich Presence",
        "language": "Language",
        "autostart": "Start with Windows",
        "show_rank": "Show rank",
        "show_level": "Show level",
        "show_party": "Show party size",
        "show_elapsed": "Show elapsed time",
        "autolock_enabled": "Auto-Lock",
        "custom": "Custom Game",
        "select_agent": "Select Agent",
        "level": "Level",
        "unranked": "Unranked",
        "party": "Party",
        "score": "Score",
        "map": "Map",
        "agent": "Agent",
        "mode": "Mode",
        "github": "GitHub",
        "tray_show": "Show Panel",
        "tray_quit": "Quit",
        "update_available": "Update available",
        "no_player": "No player info",
        "updating": "Updating",
        "update_failed": "Update failed. Try again.",
        "remaining": "left",
        "notification_title": "ValorantRPC Started",
        "notification_desc": "Application is running in background. Discord RPC is active.",
        "p_in_menu": "In Menu",
        "p_selecting_agent": "Selecting Agent",
        "p_pregame_small": "Pre-Game",
        "p_lobby": "In Lobby",
        "queuing": "In Queue",
        "p_in_game": "In Game",
    },
}


def t(language: str, key: str) -> str:
    """Seçili dilde metni döndür; yoksa İngilizce'ye, o da yoksa anahtara düş."""
    lang = language if language in STRINGS else "en"
    return STRINGS[lang].get(key) or STRINGS["en"].get(key) or key


def api_language(language: str) -> str:
    return API_LANGUAGE.get(language, "en-US")
