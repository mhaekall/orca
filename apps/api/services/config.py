import os

from dotenv import load_dotenv

load_dotenv()

UPSTASH_REDIS_REST_URL = os.environ.get("UPSTASH_REDIS_REST_URL")
UPSTASH_REDIS_REST_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN")

# Fallback credentials for Sharding
UPSTASH_CREDENTIALS = []

# Gather all REDIS_URL_X and REDIS_TOKEN_X
for k, v in os.environ.items():
    if k.startswith("UPSTASH_REDIS_REST_URL_") or k.startswith("REDIS_URL_"):
        idx = k.split("_")[-1]
        token_key = k.replace("URL", "TOKEN")
        token = os.environ.get(token_key)
        if token:
            UPSTASH_CREDENTIALS.append({"url": v, "token": token})

# Also include the default one if no numbered ones exist, or as the first one
if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN:
    if {"url": UPSTASH_REDIS_REST_URL, "token": UPSTASH_REDIS_REST_TOKEN} not in UPSTASH_CREDENTIALS:
        UPSTASH_CREDENTIALS.insert(0, {"url": UPSTASH_REDIS_REST_URL, "token": UPSTASH_REDIS_REST_TOKEN})


QSTASH_TOKEN = os.environ.get("QSTASH_TOKEN")
QSTASH_CURRENT_SIGNING_KEY = os.environ.get("QSTASH_CURRENT_SIGNING_KEY")
QSTASH_NEXT_SIGNING_KEY = os.environ.get("QSTASH_NEXT_SIGNING_KEY")

BASE_URL = "https://o.oploverz.ltd"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Upgrade-Insecure-Requests": "1",
}
