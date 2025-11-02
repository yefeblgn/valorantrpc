"""
Valorant Discord RPC - V2
Sadece Valorant Client kullanarak tam gerçek zamanlı RPC
"""

import time
import logging
from typing import Optional, Dict, Any

from config import Config
from discord_rpc import DiscordRPC
from valorant_client_v2 import ValorantClientV2
from presence_builder_v2 import PresenceBuilderV2

# Logging ayarla
logging.basicConfig(
    level=logging.INFO,  # INFO seviyesi
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class ValorantRPC:
    """Ana RPC uygulaması - Client-based"""
    
    def __init__(self):
        self.config = Config()
        self.client = ValorantClientV2(region=self.config.region)
        self.rpc = DiscordRPC(self.config.discord_client_id)
        self.presence_builder = PresenceBuilderV2()
        
        self.running = False
        self.last_presence_state = ""
        self.error_count = 0
        self.max_errors = 5
    
    def start(self):
        """RPC'yi başlat"""
        logger.info("🚀 Valorant RPC başlatılıyor...")
        
        # Discord RPC bağlantısı
        if not self.rpc.connect():
            logger.error("❌ Discord RPC bağlantısı başarısız!")
            return
        
        # Valorant Client'a bağlan (denemeye devam et)
        logger.info("🔄 Valorant bekleniyor...")
        while not self.client.connect():
            logger.warning("⏳ Valorant açık değil, 5 saniye sonra tekrar denenecek...")
            time.sleep(5)
        
        logger.info("✅ Tüm bağlantılar başarılı! RPC aktif...")
        
        self.running = True
        self.run()
    
    def run(self):
        """Ana döngü - Sadece client'tan veri al"""
        while self.running:
            try:
                # Client'tan tam durum al
                status = self.client.get_full_status()
                
                if not status:
                    logger.debug("Client'tan durum alınamadı")
                    time.sleep(2)
                    continue
                
                # Queue bilgilerini ekle
                queue_id = status.get('queue_id', '')
                status['queue_name'] = self.client.get_queue_display_name(queue_id)
                status['queue_icon'] = self.client.get_queue_icon_url(queue_id)
                
                # Map bilgisi
                map_path = status.get('match_map', '')
                status['map_name'] = self.client.get_map_display_name(map_path)
                status['map_icon'] = self.client.get_map_icon_url(map_path)
                
                # Agent bilgisi - Her durumda ekle (ingame'de agent_name olabilir)
                agent_id = status.get('agent_id', '')
                agent_name = status.get('agent_name', '')
                if agent_id:
                    status['agent_icon'] = self.client.get_agent_icon_url(agent_id)
                if not agent_name and agent_id:
                    # agent_name yoksa ID'den çevir
                    status['agent_name'] = self.client.get_agent_display_name(agent_id)
                
                # Debug log
                logger.debug(f"Session: {status.get('session_state')} | Queue: {queue_id} | Party: {status.get('party_size')}")
                
                # Presence oluştur
                presence = self.presence_builder.build_presence(status)
                
                if presence:
                    # State string oluştur (karşılaştırma için) - agent icon da dahil
                    current_state = f"{presence.get('details', '')}|{presence.get('small_image', '')}|{presence.get('party_size', [0,0])[0]}"
                    
                    if current_state != self.last_presence_state:
                        self.rpc.update_presence(presence)
                        self.last_presence_state = current_state
                        
                        # Log
                        details_text = presence.get('details', '')
                        party_info = presence.get('party_size', [0, 0])
                        party_text = f" ({party_info[0]}/{party_info[1]})" if party_info[0] > 0 else ""
                        logger.info(f"📊 {details_text}{party_text}")
                
                # Hata sayacını sıfırla
                self.error_count = 0
                
            except KeyboardInterrupt:
                logger.info("⛔ Kullanıcı tarafından durduruldu")
                break
            except Exception as e:
                self.error_count += 1
                logger.error(f"⚠️ Hata ({self.error_count}/{self.max_errors}): {e}")
                
                if self.error_count >= self.max_errors:
                    logger.error("❌ Çok fazla hata! Kapatılıyor...")
                    break
            
            # Bekleme - Artık API limiti yok, daha hızlı güncelleyebiliriz
            time.sleep(2)  # 2 saniye yeterli
        
        self.stop()
    
    def stop(self):
        """RPC'yi durdur"""
        logger.info("🛑 Valorant RPC durduruluyor...")
        self.running = False
        
        if self.client:
            self.client.close()
        
        if self.rpc:
            self.rpc.close()
        
        logger.info("✅ Temizlik tamamlandı!")

def main():
    """Ana fonksiyon"""
    rpc = ValorantRPC()
    try:
        rpc.start()
    except KeyboardInterrupt:
        logger.info("\n👋 Kapatılıyor...")
    except Exception as e:
        logger.error(f"❌ Kritik hata: {e}")
    finally:
        rpc.stop()

if __name__ == "__main__":
    main()
