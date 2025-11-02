import requests

match_id = "deb17ed7-c8f0-457f-81f0-0f64e9911e87"
api_key = "HDEV-730de03e-3e58-4e57-ad55-6ae3ead0edfa"

print(f"Testing Match ID: {match_id}")

r = requests.get(
    f'https://api.henrikdev.xyz/valorant/v2/match/{match_id}',
    headers={'Authorization': api_key},
    timeout=5
)

print(f'Status: {r.status_code}')

if r.status_code == 200:
    data = r.json()
    print(f'Response keys: {list(data.keys())}')
    
    match_data = data.get('data', {})
    print(f'Match data keys: {list(match_data.keys())}')
    
    teams = match_data.get('teams', {})
    print(f'Teams keys: {list(teams.keys())}')
    
    blue = teams.get('blue', {})
    red = teams.get('red', {})
    
    print(f'\nBlue team rounds_won: {blue.get("rounds_won")}')
    print(f'Red team rounds_won: {red.get("rounds_won")}')
    
    # Rounds objesi varsa
    if 'rounds' in blue:
        print(f'Blue rounds: {blue["rounds"]}')
    if 'rounds' in red:
        print(f'Red rounds: {red["rounds"]}')
else:
    print(f'Error: {r.text}')
