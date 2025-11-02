"""
Discord Rich Presence entegrasyonu
"""

import logging
from pypresence import Presence
from typing import Optional, Dict, Any
import time

class DiscordRPC:
    """Discord RPC yöneticisi"""
    
    def __init__(self, client_id: str):
        self.client_id = client_id
        self.rpc: Optional[Presence] = None
        self.connected = False
        self.logger = logging.getLogger(__name__)
    
    def connect(self, retry_count: int = 3) -> bool:
        """Discord RPC'ye bağlan"""
        for attempt in range(retry_count):
            try:
                self.rpc = Presence(self.client_id)
                self.rpc.connect()
                self.connected = True
                self.logger.info("Discord RPC bağlantısı kuruldu!")
                return True
            
            except Exception as e:
                self.logger.warning(f"Bağlantı denemesi {attempt + 1}/{retry_count} başarısız: {e}")
                if attempt < retry_count - 1:
                    time.sleep(2)
        
        self.logger.error("Discord RPC bağlantısı kurulamadı!")
        return False
    
    def update_presence(self, presence_data: Dict[str, Any]) -> bool:
        """Discord presence'ı güncelle"""
        if not self.connected or not self.rpc:
            self.logger.warning("Discord RPC bağlı değil!")
            return False
        
        try:
            # Presence verisini temizle (None değerleri kaldır)
            clean_data = {k: v for k, v in presence_data.items() if v is not None}
            
            # DEBUG: Discord'a gönderilen presence
            self.logger.debug(f"📤 Discord'a gönderilen presence: {clean_data}")
            
            self.rpc.update(**clean_data)
            return True
            
        except Exception as e:
            self.logger.error(f"Presence güncellenemedi: {e}")
            
            # Bağlantı kopmuşsa yeniden bağlan
            if "RpcError" in str(e) or "ConnectionRefusedError" in str(e):
                self.connected = False
                self.connect()
            
            return False
    
    def clear(self) -> bool:
        """Presence'ı temizle"""
        if not self.connected or not self.rpc:
            return False
        
        try:
            self.rpc.clear()
            return True
        except Exception as e:
            self.logger.error(f"Presence temizlenemedi: {e}")
            return False
    
    def close(self):
        """RPC bağlantısını kapat"""
        if self.connected and self.rpc:
            try:
                self.rpc.close()
                self.logger.info("Discord RPC bağlantısı kapatıldı.")
            except Exception as e:
                self.logger.error(f"RPC kapatma hatası: {e}")
            finally:
                self.connected = False
