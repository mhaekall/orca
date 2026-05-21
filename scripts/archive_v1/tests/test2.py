import requests

API = "https://jonyyyyyyyu-anime-scraper-api.hf.space"
res = requests.get(f"{API}/api/v2/anime/search?q=Slime")
print(res.text[:500])
