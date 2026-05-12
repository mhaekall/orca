import asyncio

from dotenv import load_dotenv

load_dotenv()
from db.connection import database


async def main():
    await database.connect()

    query_recent = """
        SELECT e."anilistId", m."cleanTitle", e."episodeNumber", e."updatedAt"
        FROM episodes e
        JOIN anime_metadata m ON e."anilistId" = m."anilistId"
        WHERE (e."episodeUrl" LIKE '%tg-proxy%' OR e."episodeUrl" LIKE '%workers.dev%')
        ORDER BY e."updatedAt" DESC
        LIMIT 10
    """
    recent = await database.fetch_all(query_recent)

    print("\n[DATABASE] 10 Episode Terakhir yang Berhasil Di-Ingest:")
    for r in recent:
        print(f"- {r['cleanTitle']} (Ep {r['episodeNumber']}) | Diupdate: {r['updatedAt']}")

    await database.disconnect()


asyncio.run(main())
