import requests
import json
res = requests.get("https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/anime/145545/episodes/1/stream")
print(json.dumps(res.json().get('headers', {})))
