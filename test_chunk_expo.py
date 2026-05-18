import requests

API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space"
res = requests.get(f"{API_URL}/api/v2/anime/145545/episodes/1/stream")
data = res.json()
url = data['sources'][0]['url']
print(f"Master URL: {url}")

headers = data.get('headers', {})
headers['User-Agent'] = 'okhttp/4.9.2'

master_res = requests.get(url, headers=headers)
print("Master Status:", master_res.status_code)
lines = master_res.text.split('\n')
chunks = [l for l in lines if l.startswith('http')]

if chunks:
    chunk_url = chunks[0]
    print(f"Chunk URL: {chunk_url}")
    chunk_res = requests.get(chunk_url, headers=headers)
    print("Chunk Status:", chunk_res.status_code)
    if chunk_res.status_code != 200:
        print("Chunk Body:", chunk_res.text[:200])
