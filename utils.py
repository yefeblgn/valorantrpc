"""
Yardımcı fonksiyonlar ve utility'ler
"""

import logging
import time
from typing import Dict, Any, Optional
from datetime import datetime

def setup_logging(debug: bool = False):
    """Logging yapılandırması"""
    level = logging.DEBUG if debug else logging.INFO
    
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

def get_presence_data(player_data: Dict[str, Any], config) -> Dict[str, Any]:
    """
    Oyuncu verisinden Discord presence verisi oluştur
    """
    presence = {
        'large_image': 'valorant_logo',
        'large_text': 'VALORANT',
        'start': int(time.time())
    }
    
    if not player_data:
        return presence
    
    account = player_data.get('account', {})
    mmr = player_data.get('mmr', {})
    recent_match = player_data.get('recent_match')
    
    # Oyuncu adı ve seviye
    player_name = account.get('name', 'Unknown')
    player_tag = account.get('tag', '')
    level = account.get('account_level', 0)
    
    # Rank bilgisi
    rank_info = ""
    if config.show_rank and mmr:
        current_tier = mmr.get('current_tier', 0)
        rank_name = get_rank_name(current_tier)
        rr = mmr.get('ranking_in_tier', 0)
        
        if rank_name and rank_name != "Unranked":
            rank_info = f"{rank_name} - {rr} RR"
            presence['small_image'] = get_rank_icon_key(current_tier)
            presence['small_text'] = rank_info
    
    # Detaylı durum bilgisi
    details = f"{player_name}#{player_tag}"
    if config.show_level:
        details += f" - Level {level}"
    
    presence['details'] = details
    
    # Oyun durumu
    state = "In Menus"
    
    if recent_match:
        metadata = recent_match.get('metadata', {})
        mode = metadata.get('mode', 'Unknown')
        map_name = metadata.get('map', 'Unknown')
        
        # Oyun modu
        mode_display = get_game_mode_name(mode)
        state = f"{mode_display}"
        
        # Parti bilgisi (eğer varsa)
        if config.show_party_size:
            # Party size bilgisi recent match'ten çıkarılabilir
            # Şimdilik basit tutalım
            state = f"{mode_display} on {map_name}"
    
    presence['state'] = state
    
    return presence

def get_rank_name(tier: int) -> str:
    """Tier numarasından rank ismini döndür"""
    ranks = {
        0: "Unranked",
        3: "Iron 1", 4: "Iron 2", 5: "Iron 3",
        6: "Bronze 1", 7: "Bronze 2", 8: "Bronze 3",
        9: "Silver 1", 10: "Silver 2", 11: "Silver 3",
        12: "Gold 1", 13: "Gold 2", 14: "Gold 3",
        15: "Platinum 1", 16: "Platinum 2", 17: "Platinum 3",
        18: "Diamond 1", 19: "Diamond 2", 20: "Diamond 3",
        21: "Ascendant 1", 22: "Ascendant 2", 23: "Ascendant 3",
        24: "Immortal 1", 25: "Immortal 2", 26: "Immortal 3",
        27: "Radiant"
    }
    return ranks.get(tier, "Unranked")

def get_rank_icon_key(tier: int) -> str:
    """Rank tier'ından Discord asset key'i döndür"""
    if tier == 0:
        return "unranked"
    elif 3 <= tier <= 5:
        return "iron"
    elif 6 <= tier <= 8:
        return "bronze"
    elif 9 <= tier <= 11:
        return "silver"
    elif 12 <= tier <= 14:
        return "gold"
    elif 15 <= tier <= 17:
        return "platinum"
    elif 18 <= tier <= 20:
        return "diamond"
    elif 21 <= tier <= 23:
        return "ascendant"
    elif 24 <= tier <= 26:
        return "immortal"
    elif tier == 27:
        return "radiant"
    else:
        return "unranked"

def get_game_mode_name(mode: str) -> str:
    """Oyun modu kısa adından tam adını döndür"""
    modes = {
        'competitive': 'Competitive',
        'unrated': 'Unrated',
        'spikerush': 'Spike Rush',
        'deathmatch': 'Deathmatch',
        'ggteam': 'Escalation',
        'onefa': 'Replication',
        'newmap': 'New Map',
        'snowball': 'Snowball Fight',
        'swiftplay': 'Swiftplay',
        'custom': 'Custom Game',
        'premier': 'Premier'
    }
    return modes.get(mode.lower(), mode.title())

def get_map_display_name(map_url: str) -> str:
    """Harita URL'sinden görünen adı çıkar"""
    if not map_url:
        return "Unknown"
    
    # URL'den harita ismini çıkar
    map_name = map_url.split('/')[-1].lower()
    
    map_names = {
        'ascent': 'Ascent',
        'bind': 'Bind',
        'haven': 'Haven',
        'split': 'Split',
        'icebox': 'Icebox',
        'breeze': 'Breeze',
        'fracture': 'Fracture',
        'pearl': 'Pearl',
        'lotus': 'Lotus',
        'sunset': 'Sunset',
        'abyss': 'Abyss'
    }
    
    return map_names.get(map_name, map_name.title())

def format_timestamp(iso_time: str) -> Optional[int]:
    """ISO formatındaki zamanı Unix timestamp'e çevir"""
    try:
        dt = datetime.fromisoformat(iso_time.replace('Z', '+00:00'))
        return int(dt.timestamp())
    except:
        return None
