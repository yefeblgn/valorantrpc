"""
Henrik/Valorant API'den güncel içerik verilerini çeken yardımcı script
Maplar, ajanlar, oyun modları güncel UUID'lerini alır
"""

import requests
import json

def fetch_valorant_content():
    """Henrik API'den güncel Valorant içeriğini çek"""
    
    print("📡 Henrik API'den güncel içerik çekiliyor...")
    
    try:
        # Maps
        maps_url = "https://valorant-api.com/v1/maps"
        maps_response = requests.get(maps_url, timeout=10)
        
        if maps_response.status_code == 200:
            maps_data = maps_response.json()
            print("\n🗺️ HARITALAR:")
            print("=" * 60)
            
            map_uuids = {}
            for map_item in maps_data.get('data', []):
                map_name = map_item.get('displayName', '').lower()
                map_uuid = map_item.get('uuid', '')
                map_path = map_item.get('mapUrl', '')
                
                # Path'den temiz isim çıkar
                if '/' in map_path:
                    clean_name = map_path.split('/')[-1].lower()
                else:
                    clean_name = map_name.lower()
                
                if clean_name and map_uuid:
                    map_uuids[clean_name] = map_uuid
                    print(f"'{clean_name}': '{map_uuid}',  # {map_item.get('displayName', 'Unknown')}")
            
            print("\nPython dict formatı:")
            print("map_uuids = {")
            for key, value in sorted(map_uuids.items()):
                print(f"    '{key}': '{value}',")
            print("}")
        
        # Agents
        agents_url = "https://valorant-api.com/v1/agents?isPlayableCharacter=true"
        agents_response = requests.get(agents_url, timeout=10)
        
        if agents_response.status_code == 200:
            agents_data = agents_response.json()
            print("\n\n🎭 AJANLAR:")
            print("=" * 60)
            
            agent_uuids = {}
            for agent in agents_data.get('data', []):
                agent_name = agent.get('displayName', '').lower()
                agent_uuid = agent.get('uuid', '')
                
                if agent_name and agent_uuid:
                    agent_uuids[agent_name] = agent_uuid
                    print(f"'{agent_name}': '{agent_uuid}',  # {agent.get('displayName', 'Unknown')}")
            
            print("\nPython dict formatı:")
            print("agent_uuids = {")
            for key, value in sorted(agent_uuids.items()):
                print(f"    '{key}': '{value}',")
            print("}")
        
        # Game modes
        modes_url = "https://valorant-api.com/v1/gamemodes"
        modes_response = requests.get(modes_url, timeout=10)
        
        if modes_response.status_code == 200:
            modes_data = modes_response.json()
            print("\n\n🎮 OYUN MODLARI:")
            print("=" * 60)
            
            mode_uuids = {}
            for mode in modes_data.get('data', []):
                mode_name = mode.get('displayName', '').lower()
                mode_uuid = mode.get('uuid', '')
                
                if mode_name and mode_uuid:
                    mode_uuids[mode_name] = mode_uuid
                    print(f"'{mode_name}': '{mode_uuid}',  # {mode.get('displayName', 'Unknown')}")
            
            print("\nPython dict formatı:")
            print("mode_uuids = {")
            for key, value in sorted(mode_uuids.items()):
                print(f"    '{key}': '{value}',")
            print("}")
        
        print("\n✅ Tüm içerik başarıyla çekildi!")
        
    except Exception as e:
        print(f"❌ Hata: {e}")

if __name__ == "__main__":
    fetch_valorant_content()
