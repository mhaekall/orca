import requests

API = "https://jonyyyyyyyu-anime-scraper-api.hf.space"
try:
    res = requests.get(f"{API}/api/v2/anime/search?q=Slime")
    data = res.json()
    for anime in data.get('data', []):
        if "Slime" in anime['title']:
            print(f"ID: {anime['id']} - {anime['title']}")
            ep_res = requests.get(f"{API}/api/v2/anime/{anime['id']}/episodes/1/stream")
            ep_data = ep_res.json()
            if ep_data.get('sources'):
                print(ep_data['sources'][0]['url'])
                break
except Exception as e:
    print(f"Error: {e}")
