import requests
from dotenv import dotenv_values

env_vars = dotenv_values(".env")
token = env_vars.get("QSTASH_TOKEN")
admin_key = env_vars.get("ADMIN_API_KEY")

base_headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

schedules = [
    {
        "name": "keep-alive-healthz",
        "url": "https://jonyyyyyyyu-anime-scraper-api.hf.space/healthz",
        "cron": "*/15 * * * *",
        "method": "GET"
    },
    {
        "name": "trigger-10h-sync",
        "url": f"https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/admin/trigger-10h-sync?key={admin_key}",
        "cron": "*/15 * * * *",
        "method": "POST"
    },
    {
        "name": "trigger-auto-ingest-15m",
        "url": f"https://jonyyyyyyyu-anime-ingestion-worker.hf.space/api/v2/admin/trigger-auto-ingest?key={admin_key}&shard_id=0&total_shards=1",
        "cron": "*/15 * * * *",
        "method": "GET"
    }
]

for s in schedules:
    headers = base_headers.copy()
    headers["Upstash-Cron"] = s["cron"]
    headers["Upstash-Method"] = s["method"]

    print(f"Creating schedule {s['name']}...")
    res = requests.post(f"https://qstash.upstash.io/v2/schedules/{s['url']}", headers=headers)
    if res.status_code in [200, 201]:
        print(f"Success: {res.json()}")
    else:
        print(f"Failed: {res.status_code} - {res.text}")
