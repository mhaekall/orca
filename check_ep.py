import requests
import json

API = "https://jonyyyyyyyu-anime-scraper-api.hf.space"
try:
    res = requests.get(f"{API}/api/v2/anime/98659/episodes/7/stream")
    data = res.json()
    print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")
