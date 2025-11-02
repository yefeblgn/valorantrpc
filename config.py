"""
Konfigürasyon yönetimi - LocalAppData desteği ile
"""

import json
import os
from typing import Optional
from pathlib import Path

class Config:
    """Uygulama konfigürasyonu"""
    
    @staticmethod
    def get_config_path() -> str:
        """Config dosyasının yolunu al (LocalAppData)"""
        # Windows LocalAppData yolu
        appdata = os.getenv('LOCALAPPDATA')
        if appdata:
            config_dir = Path(appdata) / 'ValorantRPC'
            config_dir.mkdir(parents=True, exist_ok=True)
            return str(config_dir / 'config.json')
        
        # Fallback: Mevcut dizin
        return 'config.json'
    
    def __init__(self, config_file: Optional[str] = None):
        if config_file is None:
            config_file = self.get_config_path()
        
        self.config_file = config_file
        self.is_first_run = not os.path.exists(self.config_file)
        
        # Varsayılan değerler
        self.riot_name = ''
        self.riot_tag = ''
        self.region = 'eu'
        self.discord_client_id = '1434340968487850135'
        self.henrik_api_key = ''
        self.update_interval = 6
        self.use_local_assets = False
        self.asset_cdn_url = 'https://media.valorant-api.com'
        self.show_rank = True
        self.show_level = True
        self.show_party_size = True
        self.show_elapsed_time = True
        self.debug_mode = False
        
        # İlk çalıştırma değilse yükle
        if not self.is_first_run:
            self.load_config()
    
    def load_config(self):
        """Konfigürasyon dosyasını yükle"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config_data = json.load(f)
                
                # Temel ayarlar
                self.riot_name = config_data.get('riot_name', '')
                self.riot_tag = config_data.get('riot_tag', '')
                self.region = config_data.get('region', 'eu')
                
                # Discord ayarları
                self.discord_client_id = config_data.get('discord_client_id', '1434340968487850135')
                
                # Henrik Dev API Key (opsiyonel)
                self.henrik_api_key = config_data.get('henrik_api_key', '')
                
                # Güncelleme aralığı
                self.update_interval = config_data.get('update_interval', 6)
                
                # Asset ayarları
                self.use_local_assets = config_data.get('use_local_assets', False)
                self.asset_cdn_url = config_data.get('asset_cdn_url', 'https://media.valorant-api.com')
                
                # Görünüm ayarları
                self.show_rank = config_data.get('show_rank', True)
                self.show_level = config_data.get('show_level', True)
                self.show_party_size = config_data.get('show_party_size', True)
                self.show_elapsed_time = config_data.get('show_elapsed_time', True)
                
                # Debug
                self.debug_mode = config_data.get('debug_mode', False)
        except Exception as e:
            print(f"⚠️ Config yüklenirken hata: {e}")
    
    def validate(self) -> bool:
        """Konfigürasyonu doğrula"""
        try:
            if not self.riot_name or self.riot_name == "YourRiotName":
                return False
            
            if not self.riot_tag or self.riot_tag == "TAG":
                return False
            
            if not self.discord_client_id:
                return False
            
            return True
        except:
            return False
    
    def has_henrik_api(self) -> bool:
        """Henrik API key var mı?"""
        return bool(self.henrik_api_key and len(self.henrik_api_key) > 10)
    
    def save(self):
        """Mevcut konfigürasyonu kaydet"""
        config_data = {
            "riot_name": self.riot_name,
            "riot_tag": self.riot_tag,
            "region": self.region,
            "discord_client_id": self.discord_client_id,
            "henrik_api_key": self.henrik_api_key,
            "update_interval": self.update_interval,
            "use_local_assets": self.use_local_assets,
            "asset_cdn_url": self.asset_cdn_url,
            "show_rank": self.show_rank,
            "show_level": self.show_level,
            "show_party_size": self.show_party_size,
            "show_elapsed_time": self.show_elapsed_time,
            "debug_mode": self.debug_mode
        }
        
        # Config dizinini oluştur
        config_dir = Path(self.config_file).parent
        config_dir.mkdir(parents=True, exist_ok=True)
        
        with open(self.config_file, 'w', encoding='utf-8') as f:
            json.dump(config_data, f, indent=4, ensure_ascii=False)
