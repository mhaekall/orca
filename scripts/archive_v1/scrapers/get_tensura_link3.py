import requests
import json

API = "https://jonyyyyyyyu-anime-scraper-api.hf.space"
# AniList ID for Tensura S1 is usually 101280. Let's try 101280 first.
try:
    res = requests.get(f"{API}/api/v2/anime/search?q=That Time I Got Reincarnated as a Slime")
    data = res.json()
    for anime in data.get('data', []):
        print(f"ID: {anime['id']} - {anime['title']}")
        if "Slime" in anime['title']:
            ep_res = requests.get(f"{API}/api/v2/anime/{anime['id']}/episodes/1/stream")
            ep_data = ep_res.json()
            if ep_data.get('sources'):
                print(ep_data['sources'][0]['url'])
except Exception as e:
    print(f"Error: {e}")
