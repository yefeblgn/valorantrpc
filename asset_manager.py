"""
Asset yönetimi - Discord RPC için görsel asset'lerin yönetimi
"""

import os
import logging
import requests
from typing import Optional, Dict
from pathlib import Path

class AssetManager:
    """Discord RPC asset yöneticisi"""
    
    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.assets_dir = Path("assets")
        
        # Local asset kullanılıyorsa klasör oluştur
        if config.use_local_assets:
            self.assets_dir.mkdir(exist_ok=True)
            self._create_asset_directories()
        
        # Asset cache
        self.cached_assets = {}
    
    def _create_asset_directories(self):
        """Asset klasör yapısını oluştur"""
        subdirs = ['ranks', 'maps', 'agents', 'modes']
        for subdir in subdirs:
            (self.assets_dir / subdir).mkdir(exist_ok=True)
    
    def get_rank_asset(self, tier: int) -> str:
        """Rank tier'ına göre asset key döndür"""
        rank_assets = {
            0: "unranked",
            3: "iron", 4: "iron", 5: "iron",
            6: "bronze", 7: "bronze", 8: "bronze",
            9: "silver", 10: "silver", 11: "silver",
            12: "gold", 13: "gold", 14: "gold",
            15: "platinum", 16: "platinum", 17: "platinum",
            18: "diamond", 19: "diamond", 20: "diamond",
            21: "ascendant", 22: "ascendant", 23: "ascendant",
            24: "immortal", 25: "immortal", 26: "immortal",
            27: "radiant"
        }
        return rank_assets.get(tier, "unranked")
    
    def get_map_asset(self, map_name: str) -> str:
        """Harita adına göre asset key döndür"""
        map_name_lower = map_name.lower()
        
        # Bilinen haritalar
        known_maps = [
            'ascent', 'bind', 'haven', 'split', 'icebox',
            'breeze', 'fracture', 'pearl', 'lotus', 'sunset', 'abyss'
        ]
        
        if map_name_lower in known_maps:
            return f"map_{map_name_lower}"
        
        return "valorant_logo"
    
    def get_agent_asset(self, agent_name: str) -> Optional[str]:
        """Agent adına göre asset key döndür"""
        if not agent_name:
            return None
        
        agent_name_clean = agent_name.lower().replace(' ', '_').replace('/', '')
        return f"agent_{agent_name_clean}"
    
    def get_mode_asset(self, mode: str) -> str:
        """Oyun moduna göre asset key döndür"""
        mode_assets = {
            'competitive': 'mode_competitive',
            'unrated': 'mode_unrated',
            'spikerush': 'mode_spikerush',
            'deathmatch': 'mode_deathmatch',
            'swiftplay': 'mode_swiftplay',
            'premier': 'mode_premier'
        }
        return mode_assets.get(mode.lower(), 'valorant_logo')
    
    def download_asset(self, asset_url: str, asset_type: str, asset_name: str) -> bool:
        """
        Asset'i indir ve local'e kaydet
        asset_type: 'ranks', 'maps', 'agents', 'modes'
        """
        if not self.config.use_local_assets:
            return False
        
        try:
            response = requests.get(asset_url, timeout=10)
            if response.status_code == 200:
                asset_path = self.assets_dir / asset_type / f"{asset_name}.png"
                with open(asset_path, 'wb') as f:
                    f.write(response.content)
                
                self.logger.info(f"Asset indirildi: {asset_name}")
                return True
            
        except Exception as e:
            self.logger.error(f"Asset indirme hatası ({asset_name}): {e}")
        
        return False
    
    def get_valorant_api_assets(self) -> Dict[str, str]:
        """
        Valorant API'den tüm asset URL'lerini al
        https://valorant-api.com/v1/
        """
        base_url = "https://valorant-api.com/v1"
        assets = {
            'agents': f"{base_url}/agents",
            'maps': f"{base_url}/maps",
            'competitive_tiers': f"{base_url}/competitivetiers",
            'game_modes': f"{base_url}/gamemodes"
        }
        return assets
    
    def download_all_assets(self):
        """Tüm gerekli asset'leri indir (ilk kurulum için)"""
        if not self.config.use_local_assets:
            self.logger.info("Local asset kullanımı kapalı, indirme yapılmıyor.")
            return
        
        self.logger.info("Asset'ler indiriliyor...")
        
        try:
            # Rank iconları
            tier_url = "https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04"
            ranks = ['iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'ascendant', 'immortal', 'radiant']
            
            for i, rank in enumerate(ranks):
                tier_num = (i * 3) + 3  # 3, 6, 9, etc.
                icon_url = f"{tier_url}/{tier_num}/smallicon.png"
                self.download_asset(icon_url, 'ranks', rank)
            
            self.logger.info("Asset indirme tamamlandı!")
            
        except Exception as e:
            self.logger.error(f"Asset indirme hatası: {e}")
    
    def prepare_discord_assets_guide(self) -> str:
        """
        Discord Developer Portal'a yüklenecek asset'ler için rehber
        """
        guide = """
        ╔══════════════════════════════════════════════════════════╗
        ║           Discord Asset Yükleme Rehberi                 ║
        ╚══════════════════════════════════════════════════════════╝
        
        Discord Developer Portal'da uygulamanızın "Rich Presence" 
        bölümüne aşağıdaki asset'leri yüklemeniz gerekiyor:
        
        📌 ANA LOGO (Zorunlu):
        - valorant_logo (512x512 px)
        
        🏆 RANK İCONLARI (Opsiyonel ama önerilen):
        - unranked
        - iron
        - bronze
        - silver
        - gold
        - platinum
        - diamond
        - ascendant
        - immortal
        - radiant
        
        🗺️ HARİTA İCONLARI (Opsiyonel):
        - map_ascent
        - map_bind
        - map_haven
        - map_split
        - map_icebox
        - map_breeze
        - map_fracture
        - map_pearl
        - map_lotus
        - map_sunset
        - map_abyss
        
        Asset'leri şu linkten indirebilirsiniz:
        https://valorant-api.com/
        
        veya resmi Valorant press kit'ten:
        https://playvalorant.com/en-us/news/
        """
        return guide
