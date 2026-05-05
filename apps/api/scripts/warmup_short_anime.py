import asyncio
import logging
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv

load_dotenv()

from db.connection import database
from services.stream_cache import stream_cache

logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)


async def warmup_short_anime():
    await database.connect()

    print("==================================================")
    print("🔥 MASS CACHE WARMUP (Short Anime <= 30 Eps)")
    print("==================================================")

    query = """
        WITH AnimeEpCounts AS (
            SELECT "anilistId", COUNT(id) as total_eps
            FROM episodes
            GROUP BY "anilistId"
        )
        SELECT e.id, e."anilistId", e."episodeNumber", m."cleanTitle", e."episodeUrl", e."providerId"
        FROM episodes e
        JOIN anime_metadata m ON e."anilistId" = m."anilistId"
        JOIN AnimeEpCounts aec ON e."anilistId" = aec."anilistId"
        WHERE e."episodeUrl" NOT LIKE '%tg-proxy%' 
          AND e."episodeUrl" NOT LIKE '%workers.dev%'
          AND e."episodeUrl" IS NOT NULL
          AND e."episodeUrl" != ''
          AND aec.total_eps <= 30
          AND m.status IN ('RELEASING', 'Releasing', 'ongoing', 'Ongoing', 'ONGOING')
          AND NOT EXISTS (
              SELECT 1 FROM episodes e2 
              WHERE e2."anilistId" = e."anilistId" 
                AND e2."episodeNumber" = e."episodeNumber" 
                AND (e2."episodeUrl" LIKE '%tg-proxy%' OR e2."episodeUrl" LIKE '%workers.dev%')
          )
        ORDER BY m.popularity DESC NULLS LAST, e."anilistId", e."episodeNumber" DESC
    """

    rows = await database.fetch_all(query)

    if not rows:
        print("✅ Tidak ada episode pending dari anime pendek (<30 eps) yang perlu dipanaskan.")
        await database.disconnect()
        return

    print(f"Menemukan {len(rows)} episode pending dari anime pendek. Memulai ekstraksi...\n")

    success_count = 0
    for idx, row in enumerate(rows):
        title = row["cleanTitle"] or "Unknown"
        ep_num = row["episodeNumber"]
        provider = row["providerId"]
        url = row["episodeUrl"]

        print(f"[{idx + 1}/{len(rows)}] ⏳ Mengekstrak: {title} | Ep {ep_num} | {provider}")

        try:
            payload = await stream_cache.get_stream(url, provider)
            if payload:
                layer = payload.get("cache_layer", "unknown")
                print(f"  └─ Hit: {layer}")
                if "sources" in payload:
                    print(f"  └─ Found {len(payload['sources'])} sources")
                    if len(payload["sources"]) > 0:
                        success_count += 1
            print("  └─ ✅ Selesai")
        except Exception as e:
            print(f"  └─ ❌ Gagal: {e}")

        await asyncio.sleep(3)

    print(f"\n🎉 WARMUP SELESAI! Berhasil memanaskan {success_count} dari {len(rows)} episode.")
    await database.disconnect()


if __name__ == "__main__":
    asyncio.run(warmup_short_anime())
