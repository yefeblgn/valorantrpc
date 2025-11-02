"""
Discord Presence Builder - Client-based version
Sadece Valorant Client'tan gelen verileri kullan
"""

import logging
import time
from typing import Dict, Any, Optional

class PresenceBuilderV2:
    """Discord RPC presence oluşturucu - Client tabanlı"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.start_timestamp = int(time.time())  # Başlangıç zamanı
    
    def build_presence(self, status: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Client durumundan presence oluştur"""
        if not status:
            return None
        
        try:
            session_state = status.get('session_state', 'menus')
            
            if session_state == 'ingame':
                return self._build_ingame_presence(status)
            elif session_state == 'pregame':
                return self._build_pregame_presence(status)
            else:  # menus
                return self._build_menu_presence(status)
                
        except Exception as e:
            self.logger.error(f"Presence oluşturma hatası: {e}")
            return None
    
    def _build_menu_presence(self, status: Dict[str, Any]) -> Dict[str, Any]:
        """Menü durumu presence"""
        queue_id = status.get('queue_id', '')
        party_size = status.get('party_size', 0)
        party_max = status.get('party_max', 5)
        rank_text = status.get('rank_text', '')
        queue_name = status.get('queue_name', 'Lobide')
        
        # Details: Oyun modu (boş olamaz!)
        if queue_id:
            details_text = queue_name
        else:
            details_text = rank_text if rank_text else "Menüde"
        
        presence = {
            'details': details_text,
            'large_image': status.get('card_large', 'valorant_logo'),
            'large_text': f"Seviye {status.get('level', 0)}",
            'start': self.start_timestamp,
        }
        
        # Party bilgisi - Discord'un party feature'ı
        if party_size > 0 and party_max > 0:
            presence['party_size'] = [party_size, party_max]
        
        # Small image: Lobide competitive ise rank göster
        if queue_id and ('competitive' in queue_id.lower() or 'rekabetçi' in queue_name.lower()):
            # Competitive lobby - rank icon + RR
            rank_icon = status.get('rank_icon')
            self.logger.debug(f"🏆 Competitive lobby - Rank icon: {rank_icon}, Rank text: {rank_text}")
            if rank_icon and rank_text:
                presence['small_image'] = rank_icon
                presence['small_text'] = rank_text
                self.logger.info(f"🏆 Rank icon ayarlandı: {rank_text}")
            else:
                # Rank yoksa queue icon
                queue_icon = status.get('queue_icon')
                if queue_icon:
                    presence['small_image'] = queue_icon
                    presence['small_text'] = queue_name
                self.logger.debug(f"⚠️ Rank yok, queue icon kullanılıyor")
        else:
            # Diğer modlar - queue icon
            queue_icon = status.get('queue_icon')
            if queue_icon:
                presence['small_image'] = queue_icon
                presence['small_text'] = queue_name
        
        # Buttons - Discord Developer Portal'dan tanımlanmış olmalı
        presence['buttons'] = [
            {'label': 'GitHub', 'url': 'https://github.com/yefeblgn/valorantrpc'}
        ]
        
        return presence
    
    def _build_pregame_presence(self, status: Dict[str, Any]) -> Dict[str, Any]:
        """Ajan seçimi presence"""
        queue_name = status.get('queue_name', 'Maç')
        party_size = status.get('party_size', 0)
        party_max = status.get('party_max', 5)
        map_name = status.get('map_name', '')
        
        # Details: Ajan Seçiliyor
        details_text = "Ajan Seçiliyor"
        
        # Large image: MAP (varsa), yoksa profil kartı
        map_icon = status.get('map_icon')
        if map_icon and map_name:
            large_image = map_icon
            large_text = map_name
        else:
            large_image = status.get('card_large', 'valorant_logo')
            large_text = f"Seviye {status.get('level', 0)}"
        
        presence = {
            'details': details_text,
            'large_image': large_image,
            'large_text': large_text,
            'start': self.start_timestamp,
        }
        
        # Party bilgisi
        if party_size > 0 and party_max > 0:
            presence['party_size'] = [party_size, party_max]
        
        # Unranked icon
        unranked_icon = "https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/0/largeicon.png"
        presence['small_image'] = unranked_icon
        presence['small_text'] = "Oyun Öncesi"
        
        # Buttons
        presence['buttons'] = [
            {'label': 'GitHub', 'url': 'https://github.com/yefeblgn/valorantrpc'}
        ]
        
        return presence
    
    def _build_ingame_presence(self, status: Dict[str, Any]) -> Dict[str, Any]:
        """Maç içi presence"""
        map_name = status.get('map_name', '')
        queue_name = status.get('queue_name', 'Maç')
        party_size = status.get('party_size', 0)
        party_max = status.get('party_max', 5)
        agent_name = status.get('agent_name', '')
        
        # Details: "Oyun Modu / 0-0"
        round_info = status.get('round_info', '')
        if round_info:
            # "Skor: 0 - 0" -> "0 - 0" çıkar
            score_part = round_info.replace('Skor: ', '')
            details_text = f"{queue_name} / {score_part}"
        else:
            # Skor yoksa sadece oyun modu
            details_text = queue_name if queue_name else "Maçta"
        
        # Large image: MAP
        map_icon = status.get('map_icon')
        if map_icon and map_name:
            large_image = map_icon
            large_text = map_name
        else:
            # Map yoksa profil kartı
            large_image = status.get('card_large', 'valorant_logo')
            large_text = f"Seviye {status.get('level', 0)}"
        
        presence = {
            'details': details_text,
            'large_image': large_image,
            'large_text': large_text,
            'start': self.start_timestamp,
        }
        
        # Party bilgisi
        if party_size > 0 and party_max > 0:
            presence['party_size'] = [party_size, party_max]
        
        # Small image: AGENT
        agent_icon = status.get('agent_icon')
        agent_name_for_display = agent_name if agent_name else status.get('agent_name', '')
        
        self.logger.debug(f"🎭 Agent icon: {agent_icon}, Agent name: {agent_name_for_display}")
        
        if agent_icon and agent_name_for_display:
            presence['small_image'] = agent_icon
            presence['small_text'] = agent_name_for_display
            self.logger.info(f"🎭 Ajan icon ayarlandı: {agent_name_for_display}")
        else:
            # Ajan yoksa log
            self.logger.warning(f"⚠️ Ajan bilgisi eksik - Icon: {agent_icon}, Name: {agent_name_for_display}")
        
        # Buttons
        presence['buttons'] = [
            {'label': 'GitHub', 'url': 'https://github.com/yefeblgn/valorantrpc'}
        ]
        
        return presence
