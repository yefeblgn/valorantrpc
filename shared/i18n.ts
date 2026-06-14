
import type { Language } from './types'

export const API_LANGUAGE: Record<Language, string> = {
  tr: 'tr-TR',
  en: 'en-US'
}

export const STRINGS: Record<Language, Record<string, string>> = {
  tr: {
    
    app_title: 'ValorantRPC',
    status_idle: 'Valorant bekleniyor…',
    status_connecting: 'Bağlanılıyor…',
    status_menu: 'Menüde',
    status_pregame: 'Ajan Seçiliyor',
    status_ingame: 'Maçta',
    discord_on: 'Discord bağlı',
    discord_off: 'Discord bağlı değil',
    valorant_on: 'Valorant bağlı',
    valorant_off: 'Valorant kapalı',
    connected: 'bağlı',
    disconnected: 'kapalı',

    
    nav_home: 'Ana Sayfa',
    nav_settings: 'Ayarlar',
    nav_about: 'Hakkında',

    
    level: 'Seviye',
    unranked: 'Derecesiz',
    party: 'Parti',
    score: 'Skor',
    map: 'Harita',
    agent: 'Ajan',
    mode: 'Mod',
    no_player: 'Oyuncu bilgisi yok',
    rr: 'RR',
    live_preview: 'Canlı Discord Önizleme',
    live_status: 'Canlı Durum',
    no_player_card: 'Oyuncu kartı yok',
    waiting_match: 'Maç bekleniyor — şu an menüde.',

    
    tab_general: 'Genel',
    tab_presence: 'Presence',
    tab_autolock: 'Oto-Kilit',
    tab_appearance: 'Görünüm',
    tab_updates: 'Güncelleme',

    
    rpc_enabled: 'Rich Presence',
    rpc_enabled_desc: 'Discord profilinde durumu göster',
    language: 'Dil',
    language_desc: 'Arayüz ve Discord metinleri',
    autostart: 'Windows ile başlat',
    autostart_desc: 'Açılışta arka planda başlat',
    start_minimized: 'Gizli başlat',
    start_minimized_desc: 'Pencere açmadan tepsiye başlat',
    close_to_tray: 'Kapatınca tepsiye gizle',
    close_to_tray_desc: 'X tuşu uygulamayı kapatmaz, gizler',
    poll_interval: 'Güncelleme aralığı',
    poll_interval_desc: 'Durum kaç saniyede bir kontrol edilsin',
    auto_check_updates: 'Otomatik güncelleme kontrolü',
    auto_check_updates_desc: 'Açılışta yeni sürüm ara',

    
    presence_display: 'Gösterim',
    show_rank: 'Rankı göster',
    show_level: 'Seviyeyi göster',
    show_party: 'Parti boyutunu göster',
    show_elapsed: 'Geçen süreyi göster',
    show_score: 'Skoru göster',
    show_button: 'Buton göster',
    presence_slots: 'Görsel Slotları',
    large_image: 'Büyük görsel',
    large_text: 'Büyük görsel yazısı',
    small_image: 'Küçük görsel',
    small_text: 'Küçük görsel yazısı',
    button_label: 'Buton metni',
    button_url: 'Buton bağlantısı',

    
    opt_auto: 'Otomatik (akıllı)',
    opt_map: 'Harita',
    opt_agent: 'Ajan',
    opt_rank: 'Rank',
    opt_playercard: 'Profil kartı',
    opt_mode: 'Mod',
    opt_none: 'Yok',
    opt_player_name: 'Oyuncu adı',
    opt_level: 'Seviye',
    opt_mode_name: 'Mod adı',
    opt_map_name: 'Harita adı',
    opt_agent_name: 'Ajan adı',
    opt_score: 'Skor',

    
    autolock_enabled: 'Oto-Kilit',
    autolock_desc: 'Özel maçta ajanı otomatik kilitle',
    select_agent: 'Ajan Seç',

    
    accent_color: 'Vurgu rengi',
    accent_color_desc: 'Arayüz vurgu rengini değiştir',

    
    current_version: 'Mevcut sürüm',
    check_update: 'Güncelleme kontrol et',
    update_available: 'Güncelleme mevcut',
    up_to_date: 'En güncel sürümdesin',
    download_install: 'İndir ve kur',
    restart_install: 'Yeniden başlat & kur',
    updating: 'Güncelleniyor',
    update_failed: 'Güncelleme başarısız. Tekrar dene.',
    remaining: 'kaldı',
    checking: 'Kontrol ediliyor…',

    
    tray_show: 'Paneli Göster',
    tray_quit: 'Çıkış',
    github: 'GitHub',
    issues: 'Hata Bildir',
    about_tagline: 'Anahtarsız, tamamen yerel Discord Rich Presence',
    about_desc:
      "VALORANT durumunu (mod · harita · ajan · skor · rank) otomatik olarak Discord profiline taşır. Veri yalnızca Riot'un yerel API'sinden okunur; hiçbir şey dış servise gönderilmez.",
    notification_title: 'ValorantRPC Başlatıldı',
    notification_desc: 'Uygulama arka planda çalışıyor. Discord RPC aktif.',
    tray_hide_title: 'ValorantRPC tepside',
    tray_hide_desc: 'Uygulama arka planda çalışmaya devam ediyor. Tepsi simgesinden aç.',

    
    custom: 'Özel Oyun',
    p_in_menu: 'Menüde',
    p_selecting_agent: 'Ajan Seçiliyor',
    p_lobby: 'Lobide',
    queuing: 'Sırada',
    p_in_game: 'Oyunda'
  },
  en: {
    app_title: 'ValorantRPC',
    status_idle: 'Waiting for Valorant…',
    status_connecting: 'Connecting…',
    status_menu: 'In Menu',
    status_pregame: 'Selecting Agent',
    status_ingame: 'In Match',
    discord_on: 'Discord connected',
    discord_off: 'Discord disconnected',
    valorant_on: 'Valorant connected',
    valorant_off: 'Valorant closed',
    connected: 'connected',
    disconnected: 'offline',

    nav_home: 'Home',
    nav_settings: 'Settings',
    nav_about: 'About',

    level: 'Level',
    unranked: 'Unranked',
    party: 'Party',
    score: 'Score',
    map: 'Map',
    agent: 'Agent',
    mode: 'Mode',
    no_player: 'No player info',
    rr: 'RR',
    live_preview: 'Live Discord Preview',
    live_status: 'Live Status',
    no_player_card: 'No player card',
    waiting_match: 'Waiting for a match — currently in menu.',

    tab_general: 'General',
    tab_presence: 'Presence',
    tab_autolock: 'Auto-Lock',
    tab_appearance: 'Appearance',
    tab_updates: 'Updates',

    rpc_enabled: 'Rich Presence',
    rpc_enabled_desc: 'Show your status on Discord',
    language: 'Language',
    language_desc: 'Interface and Discord text',
    autostart: 'Start with Windows',
    autostart_desc: 'Launch in background on startup',
    start_minimized: 'Start hidden',
    start_minimized_desc: 'Start to tray without opening a window',
    close_to_tray: 'Close to tray',
    close_to_tray_desc: 'X button hides instead of quitting',
    poll_interval: 'Update interval',
    poll_interval_desc: 'How often the status is checked',
    auto_check_updates: 'Auto update check',
    auto_check_updates_desc: 'Look for new versions on startup',

    presence_display: 'Display',
    show_rank: 'Show rank',
    show_level: 'Show level',
    show_party: 'Show party size',
    show_elapsed: 'Show elapsed time',
    show_score: 'Show score',
    show_button: 'Show button',
    presence_slots: 'Image Slots',
    large_image: 'Large image',
    large_text: 'Large image text',
    small_image: 'Small image',
    small_text: 'Small image text',
    button_label: 'Button label',
    button_url: 'Button link',

    opt_auto: 'Automatic (smart)',
    opt_map: 'Map',
    opt_agent: 'Agent',
    opt_rank: 'Rank',
    opt_playercard: 'Player card',
    opt_mode: 'Mode',
    opt_none: 'None',
    opt_player_name: 'Player name',
    opt_level: 'Level',
    opt_mode_name: 'Mode name',
    opt_map_name: 'Map name',
    opt_agent_name: 'Agent name',
    opt_score: 'Score',

    autolock_enabled: 'Auto-Lock',
    autolock_desc: 'Auto-lock your agent in custom matches',
    select_agent: 'Select Agent',

    accent_color: 'Accent color',
    accent_color_desc: 'Change the interface accent color',

    current_version: 'Current version',
    check_update: 'Check for updates',
    update_available: 'Update available',
    up_to_date: "You're on the latest version",
    download_install: 'Download & install',
    restart_install: 'Restart & install',
    updating: 'Updating',
    update_failed: 'Update failed. Try again.',
    remaining: 'left',
    checking: 'Checking…',

    tray_show: 'Show Panel',
    tray_quit: 'Quit',
    github: 'GitHub',
    issues: 'Report Issue',
    about_tagline: 'Keyless, fully local Discord Rich Presence',
    about_desc:
      "Automatically shows your VALORANT status (mode · map · agent · score · rank) on your Discord profile. Data is read only from Riot's local API; nothing is sent to external services.",
    notification_title: 'ValorantRPC Started',
    notification_desc: 'Application is running in background. Discord RPC is active.',
    tray_hide_title: 'ValorantRPC in tray',
    tray_hide_desc: 'The app keeps running in the background. Open it from the tray icon.',

    custom: 'Custom Game',
    p_in_menu: 'In Menu',
    p_selecting_agent: 'Selecting Agent',
    p_lobby: 'In Lobby',
    queuing: 'In Queue',
    p_in_game: 'In Game'
  }
}

export function t(language: Language, key: string): string {
  const lang: Language = STRINGS[language] ? language : 'en'
  return STRINGS[lang][key] ?? STRINGS.en[key] ?? key
}

export function apiLanguage(language: Language): string {
  return API_LANGUAGE[language] ?? 'en-US'
}
