import requests

url = "https://tele-proxy.moehamadhkl.workers.dev/stream/bot8783721209:AAGLjbdt14IgXfFY_zUHHC7yG1c29DtBFGY/BQACAgUAAyEGAATc0SFaAAEBSoFp_BElKjxi1GQI92ytXDJzC8LBRAACUSMAAqU34VcdDUQnaN7s5jsE"

headers = {'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'}

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
