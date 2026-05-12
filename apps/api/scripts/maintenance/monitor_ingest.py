import asyncio

import httpx
from dotenv import load_dotenv

load_dotenv()
from db.connection import database
from services.config import UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL


async def main():
    # Cek branch

    # Cek Lock di Redis Power
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{UPSTASH_REDIS_REST_URL}/keys/*",
            headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"},
        )
        data = res.json()
        keys = data.get("result", [])
        ingest_locks = [k for k in keys if "ingest" in k or "lock:" in k]
        print(f"Active Redis Locks (Power Instance): {ingest_locks}")

        # Cek lock spesifik batch
        if "lock:ingest_batch_trigger" in keys:
            res2 = await client.get(
                f"{UPSTASH_REDIS_REST_URL}/get/lock:ingest_batch_trigger",
                headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"},
            )
            print(f"Batch Lock Data: {res2.json().get('result')}")

    await database.connect()
    query_recent = """
        SELECT e."anilistId", m."cleanTitle", e."episodeNumber", e."updatedAt"
        FROM episodes e
        JOIN anime_metadata m ON e."anilistId" = m."anilistId"
        WHERE (e."episodeUrl" LIKE '%tg-proxy%' OR e."episodeUrl" LIKE '%workers.dev%')
        ORDER BY e."updatedAt" DESC
        LIMIT 3
    """
    recent = await database.fetch_all(query_recent)
    print("\n[DATABASE] 3 Episode Terakhir yang Berhasil Di-Ingest:")
    for r in recent:
        print(f"- {r['cleanTitle']} (Ep {r['episodeNumber']}) | Diupdate: {r['updatedAt']}")

    await database.disconnect()


asyncio.run(main())
