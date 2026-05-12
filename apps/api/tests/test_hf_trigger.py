import asyncio

import httpx

from db.connection import database


async def main():
    print("[1] Menembak API HF Space...")
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/admin/trigger-auto-ingest?key=26cd52813fbce8e25ccecea02540dd0d642b462f9f4cd1cb&shard_id=0&total_shards=1",
            timeout=30,
        )
        print("Response HF:", res.text)

    print("\n[2] Memantau Database selama 45 detik...")
    await database.connect()

    query = """
        SELECT e."episodeNumber", e."updatedAt"
        FROM episodes e
        JOIN anime_metadata m ON e."anilistId" = m."anilistId"
        WHERE m."cleanTitle" LIKE '%ONE PIECE%'
          AND (e."episodeUrl" LIKE '%tg-proxy%' OR e."episodeUrl" LIKE '%workers.dev%')
        ORDER BY e."updatedAt" DESC
        LIMIT 1
    """

    for i in range(3):
        row = await database.fetch_one(query)
        if row:
            print(
                f"[{i * 15}s] Episode ONE PIECE terakhir di-ingest: Ep {row['episodeNumber']} pada {row['updatedAt']}"
            )
        await asyncio.sleep(15)

    await database.disconnect()


asyncio.run(main())
