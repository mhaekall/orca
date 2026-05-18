import requests
import json
API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space"
res = requests.get(f"{API_URL}/api/v2/anime/145545/episodes/1/stream")
print(json.dumps(res.json().get('headers', {})))
