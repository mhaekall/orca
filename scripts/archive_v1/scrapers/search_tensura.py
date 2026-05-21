import requests

API = "https://jonyyyyyyyu-anime-scraper-api.hf.space"
res = requests.get(f"{API}/api/v2/anime/search?q=That Time I Got Reincarnated as a Slime")
data = res.json()
for anime in data.get('data', []):
    print(f"ID: {anime['id']} - {anime['title']}")
