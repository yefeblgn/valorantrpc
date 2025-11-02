import requests

# PUUID al
r = requests.get(
    'https://api.henrikdev.xyz/valorant/v1/account/yefeblgn/zurna',
    headers={'Authorization': 'HDEV-730de03e-3e58-4e57-ad55-6ae3ead0edfa'},
    timeout=5
)
print(f"Account API Status: {r.status_code}")
data = r.json()
puuid = data.get('data', {}).get('puuid')
print(f"PUUID: {puuid}")

if puuid:
    # Şimdi coregame raw API'yi test et
    print("\n--- Testing RAW API ---")
    r2 = requests.get(
        'https://api.henrikdev.xyz/valorant/v1/raw',
        params={'type': 'coregame', 'value': puuid, 'region': 'eu'},
        headers={'Authorization': 'HDEV-730de03e-3e58-4e57-ad55-6ae3ead0edfa'},
        timeout=5
    )
    print(f"Raw API Status: {r2.status_code}")
    print(f"Response: {r2.text[:500]}")
    
    if r2.status_code == 200:
        raw_data = r2.json()
        coregame = raw_data.get('data', {})
        teams = coregame.get('Teams', [])
        print(f"\nTeams found: {len(teams)}")
        if teams:
            for i, team in enumerate(teams):
                print(f"Team {i}: {list(team.keys())}")
                if 'RoundsWon' in team:
                    print(f"  RoundsWon: {team['RoundsWon']}")
