import requests

API = "https://jonyyyyyyyu-anime-scraper-api.hf.space"
try:
    res = requests.get(f"{API}/api/v2/anime/101280/episodes/1/stream")
    data = res.json()
    if data.get('sources'):
        print(data['sources'][0]['url'])
except Exception as e:
    print(f"Error: {e}")
