import asyncio

import httpx

from services.config import UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL


async def main():
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{UPSTASH_REDIS_REST_URL}/lpush/debug_tg_log",
            headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"},
            json=["test"]
        )
        print(res.status_code)
        print(res.json())

asyncio.run(main())
