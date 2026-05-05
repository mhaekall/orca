import asyncio

from services.cache import client as redis_client
from services.config import UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL


async def main():
    res = await redis_client.get(
        f"{UPSTASH_REDIS_REST_URL}/lrange/hf_ingest_logs/0/10",
        headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"},
    )
    print(res.json())


asyncio.run(main())
