"""
Henrik Dev Valorant API entegrasyonu
API Dokümantasyon: https://docs.henrikdev.xyz/
"""

import requests
import logging
from typing import Optional, Dict, Any
from datetime import datetime

class ValorantAPI:
    """Valorant API client"""
    
    BASE_URL = "https://api.henrikdev.xyz/valorant"
    
    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Valorant-Discord-RPC/1.0'
        })
        
        # API Key varsa ekle
        if hasattr(config, 'henrik_api_key') and config.henrik_api_key:
            self.session.headers.update({
                'Authorization': config.henrik_api_key
            })
        
        # Cache
        self.cache = {
            'account': None,
            'mmr': None,
            'last_match': None
        }
    
    def get_account_info(self) -> Optional[Dict[str, Any]]:
        """Hesap bilgilerini al"""
        try:
            url = f"{self.BASE_URL}/v1/account/{self.config.riot_name}/{self.config.riot_tag}"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 429:
                self.logger.warning("Rate limit aşıldı (429), cache kullanılıyor")
                return self.cache.get('account')
            
            if response.status_code == 200:
                data = response.json()
                if data['status'] == 200:
                    self.cache['account'] = data['data']
                    return data['data']
            
            self.logger.error(f"Hesap bilgisi alınamadı: {response.status_code}")
            return self.cache.get('account')
            
        except Exception as e:
            self.logger.error(f"API hatası (account): {e}")
            return self.cache.get('account')
    
    def get_mmr_info(self, region: str = None) -> Optional[Dict[str, Any]]:
        """MMR/Rank bilgilerini al"""
        try:
            region = region or self.config.region
            url = f"{self.BASE_URL}/v2/mmr/{region}/{self.config.riot_name}/{self.config.riot_tag}"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 429:
                self.logger.warning("Rate limit aşıldı (429), cache kullanılıyor")
                return self.cache.get('mmr')
            
            if response.status_code == 200:
                data = response.json()
                if data['status'] == 200:
                    self.cache['mmr'] = data['data']
                    return data['data']
            
            return self.cache.get('mmr')
            
        except Exception as e:
            self.logger.error(f"API hatası (mmr): {e}")
            return self.cache.get('mmr')
    
    def get_match_history(self, region: str = None, mode: str = "competitive", size: int = 1) -> Optional[list]:
        """Maç geçmişini al"""
        try:
            region = region or self.config.region
            url = f"{self.BASE_URL}/v3/matches/{region}/{self.config.riot_name}/{self.config.riot_tag}"
            params = {
                'mode': mode,
                'size': size
            }
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data['status'] == 200:
                    return data['data']
            
            return None
            
        except Exception as e:
            self.logger.error(f"API hatası (match history): {e}")
            return None
    
    def get_player_status(self) -> Optional[Dict[str, Any]]:
        """
        Oyuncunun mevcut durumunu al
        Bu fonksiyon hesap bilgisi, rank ve son maç verilerini birleştirir
        """
        try:
            # Hesap bilgilerini al
            account = self.get_account_info()
            if not account:
                return None
            
            # MMR bilgilerini al
            mmr = self.get_mmr_info()
            
            # Son maç bilgisini al (opsiyonel)
            recent_matches = self.get_match_history(size=1)
            
            # Tüm verileri birleştir
            player_data = {
                'account': account,
                'mmr': mmr,
                'recent_match': recent_matches[0] if recent_matches else None,
                'timestamp': datetime.now().isoformat()
            }
            
            return player_data
            
        except Exception as e:
            self.logger.error(f"Oyuncu durumu alınamadı: {e}")
            return None
    
    def is_in_game(self, player_data: Dict[str, Any]) -> bool:
        """Oyuncu oyunda mı kontrol et"""
        # Henrik API'de live game endpoint'i varsa kullan
        # Şimdilik son maç verisine bakarak tahmin yapıyoruz
        if not player_data or not player_data.get('recent_match'):
            return False
        
        recent_match = player_data['recent_match']
        match_start = recent_match.get('metadata', {}).get('game_start')
        
        if match_start:
            # Maç 1 saatten yeniyse oyunda olabilir
            from datetime import datetime, timedelta
            try:
                match_time = datetime.fromisoformat(match_start.replace('Z', '+00:00'))
                if datetime.now().astimezone() - match_time < timedelta(hours=1):
                    return True
            except:
                pass
        
        return False
    
    def get_game_mode_display_name(self, mode: str) -> str:
        """Oyun modu görünen adını al"""
        mode_names = {
            'competitive': 'Competitive',
            'unrated': 'Unrated',
            'spikerush': 'Spike Rush',
            'deathmatch': 'Deathmatch',
            'ggteam': 'Escalation',
            'onefa': 'Replication',
            'newmap': 'New Map',
            'custom': 'Custom Game',
            'swiftplay': 'Swiftplay',
            'premier': 'Premier'
        }
        return mode_names.get(mode.lower(), mode.title())
