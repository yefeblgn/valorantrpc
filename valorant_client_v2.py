"""
Valorant Client API - Geliştirilmiş versiyon
Lokal client'tan gerçek zamanlı tüm bilgileri al
"""

import logging
from typing import Optional, Dict, Any
import base64
import json
import requests
import time

try:
    from valclient.client import Client
except ImportError:
    logging.error("valclient kütüphanesi bulunamadı! pip install valclient")
    Client = None

class ValorantClientV2:
    """Valorant lokal client - Tam entegrasyon"""
    
    def __init__(self, region='eu', henrik_api_key=None):
        self.logger = logging.getLogger(__name__)
        self.client: Optional[Client] = None
        self.connected = False
        self.region = region
        self.henrik_api_key = henrik_api_key
        self.last_henrik_fetch = 0
        self.henrik_cache = {}
        self.cache = {
            'player_name': None,
            'player_tag': None,
            'level': None,
            'card_large': None,
            'card_small': None,
        }
    
    def connect(self) -> bool:
        """Valorant client'a bağlan"""
        if not Client:
            self.logger.error("valclient kütüphanesi yüklü değil!")
            return False
        
        try:
            self.client = Client(region=self.region)
            self.client.activate()
            
            # Oyuncu bilgilerini al ve cache'le
            self._cache_player_info()
            
            self.connected = True
            self.logger.info("✅ Valorant client'a başarıyla bağlanıldı!")
            return True
        except Exception as e:
            self.logger.warning(f"⚠️ Valorant client'a bağlanılamadı: {e}")
            self.connected = False
            return False
    
    def _cache_player_info(self):
        """Oyuncu temel bilgilerini cache'le"""
        try:
            # Riot ID'den player bilgisi al (Henrik API kullan)
            import requests
            from config import Config
            
            config = Config()
            riot_name = config.riot_name
            riot_tag = config.riot_tag
            
            self.cache['player_name'] = riot_name
            self.cache['player_tag'] = riot_tag
            
            # Henrik API'den profil kartı al
            api_url = f"https://api.henrikdev.xyz/valorant/v1/account/{riot_name}/{riot_tag}"
            headers = {}
            if hasattr(config, 'henrik_api_key') and config.henrik_api_key:
                headers['Authorization'] = config.henrik_api_key
            
            response = requests.get(api_url, headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json().get('data', {})
                self.cache['level'] = data.get('account_level', 0)
                
                # Profil kartı
                card_url = data.get('card', {}).get('large', '')
                if card_url:
                    self.cache['card_large'] = card_url
                    self.cache['card_small'] = data.get('card', {}).get('small', card_url)
            
            self.logger.info(f"Oyuncu: {self.cache['player_name']}#{self.cache['player_tag']} - Seviye {self.cache['level']}")
            
        except Exception as e:
            self.logger.debug(f"Cache bilgisi alınamadı: {e}")
    
    def get_full_status(self) -> Optional[Dict[str, Any]]:
        """Oyuncunun tam durumunu al"""
        if not self.connected or not self.client:
            self.logger.warning("Client bağlı değil, yeniden bağlanmayı deniyor...")
            self.connect()
            return None
        
        try:
            # Presence al
            self.logger.debug("Presence fetching...")
            presence = self.client.fetch_presence()
            
            if not presence:
                self.logger.warning("Presence boş geldi!")
                return None
            
            self.logger.debug(f"Presence alındı: {type(presence)}")
            
            # DEBUG: Presence'ın TÜM key'lerini logla

            
            # Parse et
            parsed = self._parse_presence(presence)
            
            if not parsed:
                self.logger.warning("Parse başarısız!")
                return None
            
            # Cache bilgilerini ekle
            parsed['player_name'] = self.cache.get('player_name', 'Unknown')
            parsed['player_tag'] = self.cache.get('player_tag', '')
            parsed['level'] = self.cache.get('level', 0)
            parsed['card_large'] = self.cache.get('card_large')
            parsed['card_small'] = self.cache.get('card_small')
            
            # Rank bilgisini al (cache yoksa veya boşsa)
            if not self.cache.get('rank_text') or not self.cache.get('rank_icon'):
                self._fetch_rank()
            parsed['rank_text'] = self.cache.get('rank_text', '')
            parsed['rank_icon'] = self.cache.get('rank_icon')
            
            return parsed
            
        except Exception as e:
            # Bağlantı hatası - reconnect dene
            if "Failed to establish a new connection" in str(e) or "10061" in str(e):
                self.logger.warning("⚠️ Valorant bağlantısı koptu, yeniden bağlanılıyor...")
                self.connected = False
                self.connect()
            else:
                self.logger.error(f"Durum alınamadı: {e}")
            return None
    
    def _fetch_rank(self):
        """Rank bilgisini Henrik API'den al ve cache'le"""
        try:
            import requests
            from config import Config
            
            config = Config()
            riot_name = config.riot_name
            riot_tag = config.riot_tag
            
            api_url = f"https://api.henrikdev.xyz/valorant/v2/mmr/{self.region}/{riot_name}/{riot_tag}"
            headers = {}
            if hasattr(config, 'henrik_api_key') and config.henrik_api_key:
                headers['Authorization'] = config.henrik_api_key
            
            response = requests.get(api_url, headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json().get('data', {})
                current_data = data.get('current_data', {})
                
                tier = current_data.get('currenttier', 0)
                rr = current_data.get('ranking_in_tier', 0)
                
                # Rank adını al (2025 güncel - Yücelik + 4 Radiant tier)
                rank_names = {
                    0: 'Derecesiz',
                    1: 'Kullanılmıyor', 2: 'Kullanılmıyor',
                    3: 'Demir 1', 4: 'Demir 2', 5: 'Demir 3',
                    6: 'Bronz 1', 7: 'Bronz 2', 8: 'Bronz 3',
                    9: 'Gümüş 1', 10: 'Gümüş 2', 11: 'Gümüş 3',
                    12: 'Altın 1', 13: 'Altın 2', 14: 'Altın 3',
                    15: 'Platin 1', 16: 'Platin 2', 17: 'Platin 3',
                    18: 'Elmas 1', 19: 'Elmas 2', 20: 'Elmas 3',
                    21: 'Yücelik 1', 22: 'Yücelik 2', 23: 'Yücelik 3',  # Ascendant
                    24: 'Ölümsüz 1', 25: 'Ölümsüz 2', 26: 'Ölümsüz 3',  # Immortal
                    27: 'Radiant', 28: 'Radiant', 29: 'Radiant', 30: 'Radiant'  # 4 Radiant tier
                }
                
                rank_name = rank_names.get(tier, 'Derecesiz')
                
                # Sadece ranked ise göster
                if tier > 2:  # Demir 1'den başla
                    self.cache['rank_text'] = f"{rank_name} - {rr} RR"
                    self.cache['rank_icon'] = f"https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/{tier}/largeicon.png"
                else:
                    # Derecesiz - gösterme
                    self.cache['rank_text'] = ''
                    self.cache['rank_icon'] = None
                
                self.logger.info(f"✅ Rank çekildi: {self.cache['rank_text']} | Icon: {self.cache.get('rank_icon', 'None')}")
                
        except Exception as e:
            self.logger.debug(f"Rank alınamadı: {e}")
            self.cache['rank_text'] = ''
            self.cache['rank_icon'] = None
    
    def _fetch_live_match_scores(self, match_id: str) -> Optional[tuple]:
        """Henrik API'den match ID ile aktif maçın skorlarını al"""
        # Rate limiting - 3 saniyede bir fetch
        now = time.time()
        if now - self.last_henrik_fetch < 3:
            cached = self.henrik_cache.get('scores')
            if cached:
                return cached
        
        try:
            # Henrik API - Match details endpoint
            # /valorant/v2/match/{matchid}
            api_url = f"https://api.henrikdev.xyz/valorant/v2/match/{match_id}"
            headers = {}
            if self.henrik_api_key:
                headers['Authorization'] = self.henrik_api_key
            
            response = requests.get(api_url, headers=headers, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                
                # Response formatı: {"data": {"teams": {"red": {...}, "blue": {...}}}}
                match_data = data.get('data', {})
                if not match_data:
                    self.logger.debug("Henrik API: Match data yok")
                    return None
                
                teams_data = match_data.get('teams', {})
                if not teams_data:
                    self.logger.debug("Henrik API: Teams data yok")
                    return None
                
                # Blue ve Red team skorlarını al
                blue_team = teams_data.get('blue', {})
                red_team = teams_data.get('red', {})
                
                blue_score = blue_team.get('rounds_won', 0) or blue_team.get('rounds', {}).get('won', 0)
                red_score = red_team.get('rounds_won', 0) or red_team.get('rounds', {}).get('won', 0)
                
                # Kendi takımımızı bul - players içinde PUUID kontrolü
                puuid = getattr(self.client, 'puuid', None)
                if not puuid:
                    # PUUID yoksa ilk takımı ally kabul et
                    ally_score = blue_score
                    enemy_score = red_score
                else:
                    # PUUID'ye göre takım belirle
                    blue_players = blue_team.get('players', [])
                    red_players = red_team.get('players', [])
                    
                    is_blue = any(p.get('puuid') == puuid for p in blue_players)
                    
                    if is_blue:
                        ally_score = blue_score
                        enemy_score = red_score
                    else:
                        ally_score = red_score
                        enemy_score = blue_score
                
                self.last_henrik_fetch = now
                self.henrik_cache['scores'] = (ally_score, enemy_score)
                
                self.logger.info(f"✅ Henrik API - Skorlar alındı: {ally_score}-{enemy_score}")
                return (ally_score, enemy_score)
            
            elif response.status_code == 404:
                self.logger.debug("Henrik API: Aktif maç bulunamadı (404)")
                return None
            else:
                self.logger.debug(f"Henrik API: HTTP {response.status_code}")
                return None
                
        except requests.exceptions.Timeout:
            self.logger.info("❌ Henrik API: Timeout (5s)")
            return None
        except Exception as e:
            self.logger.info(f"❌ Henrik API live match fetch hatası: {type(e).__name__}: {e}")
            return None
    
    def _parse_presence(self, presence: Dict) -> Dict[str, Any]:
        """Presence verisini detaylı parse et - Yeni Valclient API formatı"""
        try:
            parsed = {
                'session_state': 'menus',
                'queue_id': None,
                'party_size': 0,
                'party_max': 5,
                'is_party_owner': False,
                'match_map': None,
                'game_mode': None,
                'agent_name': None,
                'agent_id': None,
                'is_valid': False,
            }
            
            self.logger.debug(f"Parsing presence keys: {list(presence.keys())}")
            
            # Yeni API formatı - bilgiler direkt presence objesinde
            parsed['is_valid'] = presence.get('isValid', False)
            parsed['queue_id'] = presence.get('queueId', '')
            parsed['party_size'] = presence.get('partySize', 0)
            parsed['party_max'] = presence.get('maxPartySize', 5)
            
            # playerPresenceData içinde ajan olabilir mi kontrol et
            player_data = presence.get('playerPresenceData', {})
            if player_data:
                self.logger.debug(f"👤 Player Data Keys: {list(player_data.keys())}")
                self.logger.debug(f"👤 Player Data: {player_data}")
            
            # Match presence data (maç içi bilgiler)
            match_data = presence.get('matchPresenceData', {})
            if match_data and isinstance(match_data, dict):
                
                parsed['match_map'] = match_data.get('matchMap', '')
                parsed['game_mode'] = match_data.get('queueId', '')
                parsed['agent_id'] = match_data.get('characterId', '')
                
                # Agent ID yoksa alternatifleri dene
                if not parsed['agent_id']:
                    parsed['agent_id'] = match_data.get('characterSelectId', '')
                if not parsed['agent_id']:
                    parsed['agent_id'] = match_data.get('agentId', '')
                
                self.logger.debug(f"🎭 Match Data Keys: {list(match_data.keys())}")
                self.logger.debug(f"🎭 Match Data Full: {match_data}")
                self.logger.debug(f"🎭 Agent ID from match data: {parsed['agent_id']}")
                
                # Maç durumu kontrolü - sessionLoopState kontrol et
                is_match_in_progress = match_data.get('isMatchInProgress', False)
                session_loop_state = match_data.get('sessionLoopState', '').lower()
                game_loop_state = match_data.get('gameLoopState', '').lower()
                
                self.logger.info(f"🎮 Session Loop State: {session_loop_state}, InProgress: {is_match_in_progress}")
                
                # Map varsa VE oyun başlamışsa gerçekten maçtayız
                # sessionLoopState: "INGAME" = Maçta, "MENUS" = Lobide
                if parsed['match_map'] and (is_match_in_progress or 'ingame' in session_loop_state or 'ingame' in game_loop_state):
                    parsed['session_state'] = 'ingame'
                    
                    # Agent ismini al
                    agent_id = parsed['agent_id']
                    if agent_id:
                        parsed['agent_name'] = self.get_agent_display_name(agent_id)
                        self.logger.info(f"🎭 Agent detected: {parsed['agent_name']} (ID: {agent_id[:8]}...)")
                    else:
                        # Presence'da yok, coregame'den dene
                        try:
                            coregame_match = self.client.coregame_fetch_match()
                            if coregame_match and 'Players' in coregame_match:
                                # Kendi player UUID'imizi bul
                                puuid = self.client.puuid
                                for player in coregame_match['Players']:
                                    if player.get('Subject') == puuid:
                                        agent_id = player.get('CharacterID', '')
                                        if agent_id:
                                            parsed['agent_id'] = agent_id
                                            parsed['agent_name'] = self.get_agent_display_name(agent_id)
                                            self.logger.info(f"🎭 Agent from coregame: {parsed['agent_name']}")
                                        break
                        except:
                            pass
                        
                        if not parsed.get('agent_id'):
                            self.logger.warning(f"⚠️ Agent ID bulunamadı! Match data keys: {list(match_data.keys())}")
                    
                    # Round bilgisi (score) - Deathmatch ise farklı skor
                    queue_lower = parsed.get('game_mode', '').lower()
                    
                    # Custom oyunlarda skorlar presence'da gelmiyor
                    if 'custom' in queue_lower or parsed.get('provisioning_flow') == 'CustomGame':
                        parsed['round_info'] = "Skor: Özel Oyun"
                        self.logger.info(f"🎯 Custom game detected - score tracking unavailable")
                    elif 'deathmatch' in queue_lower:
                        # Deathmatch: Presence'dan skorları al (varsa), yoksa 0-0
                        ally_dm = presence.get('partyOwnerMatchScoreAllyTeam', 0)
                        enemy_dm = presence.get('partyOwnerMatchScoreEnemyTeam', 0)
                        
                        # DEBUG: Her seferinde logla ki güncellenip güncellenmediğini görelim
                        self.logger.info(f"📊 Presence'dan okunan: Ally={ally_dm}, Enemy={enemy_dm}")
                        
                        if ally_dm is not None and enemy_dm is not None:
                            # Deathmatch'de "ally" bizim kill sayımız, "enemy" top kill
                            parsed['round_info'] = f"Skor: {enemy_dm} - {ally_dm}"
                            self.logger.info(f"🎯 Deathmatch Skor: En İyi {enemy_dm} - Bizim {ally_dm}")
                        else:
                            parsed['round_info'] = "Skor: 0 - 0"
                            self.logger.debug("Deathmatch skor presence'da yok")
                    else:
                        # Normal mod: takım skorları - presence objesinde!
                        score_ally = None
                        score_enemy = None

                        # Birincil anahtarlar - PRESENCE objesinde, match_data'da değil!
                        score_ally = presence.get('partyOwnerMatchScoreAllyTeam')
                        score_enemy = presence.get('partyOwnerMatchScoreEnemyTeam')
                        
                        # DEBUG: Her seferinde logla
                        self.logger.info(f"📊 Presence'dan okunan skorlar: Ally={score_ally}, Enemy={score_enemy}")
                        
                        # Skorlar presence'da olmalı, yoksa 0 kullan

                        # Final fallback: 0-0
                        try:
                            if score_ally is None:
                                score_ally = 0
                            if score_enemy is None:
                                score_enemy = 0
                        except Exception:
                            score_ally = 0
                            score_enemy = 0

                        parsed['round_info'] = f"Skor: {score_ally} - {score_enemy}"
                        self.logger.info(f"🎯 Round Skor güncellendi: {score_ally} - {score_enemy}")
                else:
                    # Map yok veya oyun başlamamış = Lobide/Custom lobby
                    parsed['session_state'] = 'menus'
                    self.logger.debug(f"LOBBY - Queue: {parsed['game_mode']}, Map: {parsed['match_map']}, InProgress: {is_match_in_progress}")
            
            # sessionLoopState'den pregame kontrolü
            if session_loop_state == 'pregame':
                parsed['session_state'] = 'pregame'
                self.logger.debug(f"PREGAME - sessionLoopState: pregame")
            
            # Party presence data (lobby bilgileri)
            party_data = presence.get('partyPresenceData', {})
            if party_data and isinstance(party_data, dict):
                party_state = party_data.get('partyState', '').lower()
                queue_from_party = party_data.get('queueId', '')
                
                if 'pregame' in party_state or 'agent' in party_state:
                    parsed['session_state'] = 'pregame'
                    self.logger.debug(f"PREGAME - Party state: {party_state}")
                elif party_state == 'matchmaking':
                    parsed['session_state'] = 'menus'
                    if queue_from_party:
                        parsed['queue_id'] = queue_from_party
                    self.logger.debug(f"LOBBY - Queue: {parsed['queue_id']}")
                elif queue_from_party:
                    # Party'de queue var ama state farklı - menüde queue seçili
                    parsed['queue_id'] = queue_from_party
            
            # Queue ID yoksa ana presence'tan al
            if not parsed['queue_id']:
                parsed['queue_id'] = presence.get('queueId', '')
            
            # Provisioning flow kontrolü (özel oyun, custom)
            prov_flow = presence.get('provisioningFlow', '').lower()
            if 'custom' in prov_flow:
                parsed['queue_id'] = 'custom'
                self.logger.debug("CUSTOM GAME detected")
            
            self.logger.info(f"🔍 State: {parsed['session_state']} | Queue: '{parsed['queue_id']}' | Party: {parsed['party_size']}")
            
            return parsed
            
        except Exception as e:
            self.logger.error(f"Presence parse hatası: {e}", exc_info=True)
            return {}
    
    def get_queue_display_name(self, queue_id: str) -> str:
        """Queue ID'den Türkçe oyun modu adı"""
        if not queue_id:
            return "Menü"
        
        queue_lower = queue_id.lower()
        
        # Valorant queue ID'leri (2025 güncel - tüm modlar)
        queue_map = {
            # Ana Modlar
            'competitive': 'Rekabetçi',
            'competitiveteam': 'Takımlı Rekabetçi',
            'unrated': 'Derecesiz',
            'swiftplay': 'Tam Gaz',
            'spikerush': 'Spike Hücum',
            'deathmatch': 'Ölüm Maçı',
            'teamdeathmatch': 'Takımlı Ölüm Maçı',
            'hurm': 'Takımlı Ölüm Maçı',
            
            # Özel Modlar
            'ggteam': 'Tırmanış',
            'onefa': 'Kopyalama',
            'snowball': 'Kartopu Savaşı',
            'newmap': 'Yeni Harita',
            'custom': 'Özel Oyun',
            
            # Yeni Modlar (2024-2025)
            'premier': 'Premier',
            'clash': 'Çatışma',
            'arcade': 'Arcade',
            'escalation': 'Tırmanış',
            'lotus': 'Lotus Test',
            
            # Limitsiz ve Özel Eventler
            'unlimited': 'Limitsiz',
            'infiniteabilities': 'Sınırsız Yetenek',
            'replication': 'Kopyalama',
        }
        
        # Tam eşleşme
        if queue_lower in queue_map:
            return queue_map[queue_lower]
        
        # Parçalı eşleşme
        for key, value in queue_map.items():
            if key in queue_lower:
                return value
        
        return "Özel Oyun"
    
    def get_map_display_name(self, map_path: str) -> str:
        """Map path'inden Türkçe harita adı"""
        if not map_path:
            return ""
        
        map_lower = map_path.lower()
        
        map_names = {
            # Ana Haritalar (Competitive/Unrated)
            'ascent': 'Ascent',
            'bind': 'Bind',
            'duality': 'Bind',
            'haven': 'Haven',
            'triad': 'Haven',
            'split': 'Split',
            'bonsai': 'Split',
            'icebox': 'Icebox',
            'port': 'Icebox',
            'breeze': 'Breeze',
            'foxtrot': 'Breeze',
            'fracture': 'Fracture',
            'canyon': 'Fracture',
            'pearl': 'Pearl',
            'pitt': 'Pearl',
            'lotus': 'Lotus',
            'jam': 'Lotus',
            'sunset': 'Sunset',
            'juliett': 'Sunset',
            'abyss': 'Abyss',
            'infinity': 'Abyss',
            'corrode': 'Corrode',
            'rook': 'Corrode',
            
            # Çatışma (Clash) Mapleri
            'drift': 'Drift',
            'hurm_helix': 'Drift',
            'district': 'District',
            'hurm_alley': 'District',
            'kasbah': 'Kasbah',
            'hurm_bowl': 'Kasbah',
            'piazza': 'Piazza',
            'hurm_yard': 'Piazza',
            'glitch': 'Glitch',
            'hurm_hightide': 'Glitch',
            
            # Skirmish
            'skirmish': 'Çatışma',
            
            # Özel
            'range': 'Poligon',
        }
        
        for key, value in map_names.items():
            if key in map_lower:
                return value
        
        return "Bilinmeyen Harita"
    
    def get_queue_icon_url(self, queue_id: str) -> Optional[str]:
        """Queue ID için icon URL - Valorant API'den çek"""
        if not queue_id:
            return None
        
        queue_lower = queue_id.lower()
        
        # Valorant API'den mode listesini kullan (2025 güncel - API'den çekildi)
        mode_uuids = {
            'competitive': '96bd3920-4f36-d026-2b28-c683eb0bcac5',
            'competitiveteam': '96bd3920-4f36-d026-2b28-c683eb0bcac5',
            'unrated': '96bd3920-4f36-d026-2b28-c683eb0bcac5',  # Standard
            'spikerush': 'e921d1e6-416b-c31f-1291-74930c330b7b',
            'deathmatch': 'a8790ec5-4237-f2f0-e93b-08a8e89865b2',
            'swiftplay': '5d0f264b-4ebe-cc63-c147-809e1374484b',
            'ggteam': 'a4ed6518-4741-6dcb-35bd-f884aecdc859',
            'escalation': 'a4ed6518-4741-6dcb-35bd-f884aecdc859',
            'onefa': '4744698a-4513-dc96-9c22-a9aa437e4a58',
            'replication': '4744698a-4513-dc96-9c22-a9aa437e4a58',
            'hurm': 'e086db66-47fd-e791-ca81-06a645ac7661',
            'teamdeathmatch': 'e086db66-47fd-e791-ca81-06a645ac7661',
            'custom': '00000000-0000-0000-0000-000000000000',
            'premier': '96bd3920-4f36-d026-2b28-c683eb0bcac5',
            'clash': '0e9805d8-4af6-5ffb-f467-55806a6bc484',  # Skirmish
            'arcade': '0e9805d8-4af6-5ffb-f467-55806a6bc484',
            'snowball': '57038d6d-49b1-3a74-c5ef-3395d9f23a97',
            'range': 'e2dc3878-4fe5-d132-28f8-3d8c259efcc6',
        }
        
        for key, uuid in mode_uuids.items():
            if key in queue_lower:
                return f"https://media.valorant-api.com/gamemodes/{uuid}/displayicon.png"
        
        return None
    
    def get_map_icon_url(self, map_path: str) -> Optional[str]:
        """Map path için splash art URL - Valorant API'den"""
        if not map_path:
            return None
        
        map_lower = map_path.lower()
        
        # Map UUID'leri (2025 güncel - API'den çekildi)
        map_uuids = {
            # Ana Haritalar (Competitive/Unrated)
            'ascent': '7eaecc1b-4337-bbf6-6ab9-04b8f06b3319',
            'bind': '2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba',
            'duality': '2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba',
            'haven': '2bee0dc9-4ffe-519b-1cbd-7fbe763a6047',
            'triad': '2bee0dc9-4ffe-519b-1cbd-7fbe763a6047',
            'split': 'd960549e-485c-e861-8d71-aa9d1aed12a2',
            'bonsai': 'd960549e-485c-e861-8d71-aa9d1aed12a2',
            'icebox': 'e2ad5c54-4114-a870-9641-8ea21279579a',
            'port': 'e2ad5c54-4114-a870-9641-8ea21279579a',
            'breeze': '2fb9a4fd-47b8-4e7d-a969-74b4046ebd53',
            'foxtrot': '2fb9a4fd-47b8-4e7d-a969-74b4046ebd53',
            'fracture': 'b529448b-4d60-346e-e89e-00a4c527a405',
            'canyon': 'b529448b-4d60-346e-e89e-00a4c527a405',
            'pearl': 'fd267378-4d1d-484f-ff52-77821ed10dc2',
            'pitt': 'fd267378-4d1d-484f-ff52-77821ed10dc2',
            'lotus': '2fe4ed3a-450a-948b-6d6b-e89a78e680a9',
            'jam': '2fe4ed3a-450a-948b-6d6b-e89a78e680a9',
            'sunset': '92584fbe-486a-b1b2-9faa-39b0f486b498',
            'juliett': '92584fbe-486a-b1b2-9faa-39b0f486b498',
            'abyss': '224b0a95-48b9-f703-1bd8-67aca101a61f',
            'infinity': '224b0a95-48b9-f703-1bd8-67aca101a61f',
            'corrode': '1c18ab1f-420d-0d8b-71d0-77ad3c439115',
            'rook': '1c18ab1f-420d-0d8b-71d0-77ad3c439115',
            
            # Çatışma (Clash) Mapleri - hurm prefix
            'drift': '2c09d728-42d5-30d8-43dc-96a05cc7ee9d',
            'hurm_helix': '2c09d728-42d5-30d8-43dc-96a05cc7ee9d',
            'district': '690b3ed2-4dff-945b-8223-6da834e30d24',
            'hurm_alley': '690b3ed2-4dff-945b-8223-6da834e30d24',
            'kasbah': '12452a9d-48c3-0b02-e7eb-0381c3520404',
            'hurm_bowl': '12452a9d-48c3-0b02-e7eb-0381c3520404',
            'piazza': 'de28aa9b-4cbe-1003-320e-6cb3ec309557',
            'hurm_yard': 'de28aa9b-4cbe-1003-320e-6cb3ec309557',
            'glitch': 'd6336a5a-428f-c591-98db-c8a291159134',
            'hurm_hightide': 'd6336a5a-428f-c591-98db-c8a291159134',
            
            # Skirmish mapleri
            'skirmish_a': 'a9009649-421f-d5d5-f80c-0cbe02c125bb',
            'skirmish_b': 'a38a3f9a-4042-844c-8970-a3ac2f7ce93d',
            'skirmish_c': 'a264de0f-4a04-9c78-c97a-a6b192ce6e86',
            
            # Range
            'range': 'ee613ee9-28b7-4beb-9666-08db13bb2244',
        }
        
        for key, uuid in map_uuids.items():
            if key in map_lower:
                # Splash art kullan (daha güzel görünür)
                return f"https://media.valorant-api.com/maps/{uuid}/splash.png"
        
        return None
    
    def get_agent_icon_url(self, agent_id: str) -> Optional[str]:
        """Agent ID'den icon URL - Valorant API"""
        if not agent_id:
            return None
        
        agent_lower = agent_id.lower()
        
        # Agent UUID'leri (2025 güncel - API'den çekildi)
        agent_uuids = {
            'astra': '41fb69c1-4189-7b37-f117-bcaf1e96f1bf',
            'breach': '5f8d3a7f-467b-97f3-062c-13acf203c006',
            'brimstone': '9f0d8ba9-4140-b941-57d3-a7ad57c6b417',
            'chamber': '22697a3d-45bf-8dd7-4fec-84a9e28c69d7',
            'clove': '1dbf2edd-4729-0984-3115-daa5eed44993',
            'cypher': '117ed9e3-49f3-6512-3ccf-0cada7e3823b',
            'deadlock': 'cc8b64c8-4b25-4ff9-6e7f-37b4da43d235',
            'fade': 'dade69b4-4f5a-8528-247b-219e5a1facd6',
            'gekko': 'e370fa57-4757-3604-3648-499e1f642d3f',
            'harbor': '95b78ed7-4637-86d9-7e41-71ba8c293152',
            'iso': '0e38b510-41a8-5780-5e8f-568b2a4f2d6c',
            'jett': 'add6443a-41bd-e414-f6ad-e58d267f4e95',
            'kayo': '601dbbe7-43ce-be57-2a40-4abd24953621',
            'kay/o': '601dbbe7-43ce-be57-2a40-4abd24953621',
            'killjoy': '1e58de9c-4950-5125-93e9-a0aee9f98746',
            'neon': 'bb2a4828-46eb-8cd1-e765-15848195d751',
            'omen': '8e253930-4c05-31dd-1b6c-968525494517',
            'phoenix': 'eb93336a-449b-9c1b-0a54-a891f7921d69',
            'raze': 'f94c3b30-42be-e959-889c-5aa313dba261',
            'reyna': 'a3bfb853-43b2-7238-a4f1-ad90e9e46bcc',
            'sage': '569fdd95-4d10-43ab-ca70-79becc718b46',
            'skye': '6f2a04ca-43e0-be17-7f36-b3908627744d',
            'sova': '320b2a48-4d9b-a075-30f1-1f93a9b638fa',
            'tejo': 'b444168c-4e35-8076-db47-ef9bf368f384',
            'veto': '92eeef5d-43b5-1d4a-8d03-b3927a09034b',
            'viper': '707eab51-4836-f488-046a-cda6bf494859',
            'vyse': 'efba5359-4016-a1e5-7626-b1ae76895940',
            'waylay': 'df1cb487-4902-002e-5c17-d28e83e78588',
            'yoru': '7f94d92c-4234-0a36-9646-3a87eb8b5c89',
        }
        
        for key, uuid in agent_uuids.items():
            if key in agent_lower:
                return f"https://media.valorant-api.com/agents/{uuid}/displayicon.png"
        
        # UUID direkt verilmişse
        if len(agent_id) > 30:  # UUID formatı
            return f"https://media.valorant-api.com/agents/{agent_id}/displayicon.png"
        
        return None
    
    def get_agent_display_name(self, agent_id: str) -> str:
        """Agent ID'den Türkçe isim"""
        if not agent_id:
            return ""
        
        agent_lower = agent_id.lower()
        
        # Agent UUID'leri
        agent_uuids = {
            'astra': '41fb69c1-4189-7b37-f117-bcaf1e96f1bf',
            'breach': '5f8d3a7f-467b-97f3-062c-13acf203c006',
            'brimstone': '9f0d8ba9-4140-b941-57d3-a7ad57c6b417',
            'chamber': '22697a3d-45bf-8dd7-4fec-84a9e28c69d7',
            'clove': '1dbf2edd-4729-0984-3115-daa5eed44993',
            'cypher': '117ed9e3-49f3-6512-3ccf-0cada7e3823b',
            'deadlock': 'cc8b64c8-4b25-4ff9-6e7f-37b4da43d235',
            'fade': 'dade69b4-4f5a-8528-247b-219e5a1facd6',
            'gekko': 'e370fa57-4757-3604-3648-499e1f642d3f',
            'harbor': '95b78ed7-4637-86d9-7e41-71ba8c293152',
            'iso': '0e38b510-41a8-5780-5e8f-568b2a4f2d6c',
            'jett': 'add6443a-41bd-e414-f6ad-e58d267f4e95',
            'kayo': '601dbbe7-43ce-be57-2a40-4abd24953621',
            'killjoy': '1e58de9c-4950-5125-93e9-a0aee9f98746',
            'neon': 'bb2a4828-46eb-8cd1-e765-15848195d751',
            'omen': '8e253930-4c05-31dd-1b6c-968525494517',
            'phoenix': 'eb93336a-449b-9c1b-0a54-a891f7921d69',
            'raze': 'f94c3b30-42be-e959-889c-5aa313dba261',
            'reyna': 'a3bfb853-43b2-7238-a4f1-ad90e9e46bcc',
            'sage': '569fdd95-4d10-43ab-ca70-79becc718b46',
            'skye': '6f2a04ca-43e0-be17-7f36-b3908627744d',
            'sova': '320b2a48-4d9b-a075-30f1-1f93a9b638fa',
            'tejo': 'b444168c-4e35-8076-db47-ef9bf368f384',
            'veto': '92eeef5d-43b5-1d4a-8d03-b3927a09034b',
            'viper': '707eab51-4836-f488-046a-cda6bf494859',
            'vyse': 'efba5359-4016-a1e5-7626-b1ae76895940',
            'waylay': 'df1cb487-4902-002e-5c17-d28e83e78588',
            'yoru': '7f94d92c-4234-0a36-9646-3a87eb8b5c89',
        }
        
        # UUID ise UUID'den isim bul
        if len(agent_id) > 30:
            for key, uuid in agent_uuids.items():
                if uuid.lower() == agent_lower:
                    # Key'den display name'e çevir
                    agent_names = {
                        'jett': 'Jett', 'phoenix': 'Phoenix', 'reyna': 'Reyna', 'raze': 'Raze',
                        'yoru': 'Yoru', 'neon': 'Neon', 'iso': 'Iso', 'brimstone': 'Brimstone',
                        'viper': 'Viper', 'omen': 'Omen', 'astra': 'Astra', 'harbor': 'Harbor',
                        'clove': 'Clove', 'veto': 'Veto', 'sage': 'Sage', 'cypher': 'Cypher',
                        'killjoy': 'Killjoy', 'chamber': 'Chamber', 'deadlock': 'Deadlock',
                        'vyse': 'Vyse', 'sova': 'Sova', 'breach': 'Breach', 'skye': 'Skye',
                        'kayo': 'KAY/O', 'fade': 'Fade', 'gekko': 'Gekko', 'tejo': 'Tejo',
                        'waylay': 'Waylay',
                    }
                    return agent_names.get(key, key.capitalize())
        
        # İsimden de kontrol et
        agent_names = {
            'jett': 'Jett', 'phoenix': 'Phoenix', 'reyna': 'Reyna', 'raze': 'Raze',
            'yoru': 'Yoru', 'neon': 'Neon', 'iso': 'Iso', 'brimstone': 'Brimstone',
            'viper': 'Viper', 'omen': 'Omen', 'astra': 'Astra', 'harbor': 'Harbor',
            'clove': 'Clove', 'veto': 'Veto', 'sage': 'Sage', 'cypher': 'Cypher',
            'killjoy': 'Killjoy', 'chamber': 'Chamber', 'deadlock': 'Deadlock',
            'vyse': 'Vyse', 'sova': 'Sova', 'breach': 'Breach', 'skye': 'Skye',
            'kayo': 'KAY/O', 'kay/o': 'KAY/O', 'fade': 'Fade', 'gekko': 'Gekko',
            'tejo': 'Tejo', 'waylay': 'Waylay',
        }
        
        for key, name in agent_names.items():
            if key in agent_lower:
                return name
        
        return ""
    
    def close(self):
        """Bağlantıyı kapat"""
        if self.client:
            try:
                self.client.close()
                self.logger.info("Valorant client bağlantısı kapatıldı")
            except:
                pass
        self.connected = False
