import requests

API = "https://jonyyyyyyyu-anime-scraper-api.hf.space"
try:
    res = requests.get(f"{API}/api/v2/anime/search?q=Classroom of the Elite")
    data = res.json()
    for anime in data.get('data', []):
        print(f"ID: {anime['id']} - {anime['title']}")
except Exception as e:
    print(f"Error: {e}")
