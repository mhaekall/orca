import asyncio
import sys
import os
import logging

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv()

from db.connection import database
from services.stream_cache import stream_cache

logging.getLogger("httpx").setLevel(logging.WARNING)

async def dry_run():
    await database.connect()
    
    query = """
        SELECT e.id, e."anilistId", e."episodeNumber", m."cleanTitle", e."episodeUrl", e."providerId"
        FROM episodes e
        JOIN anime_metadata m ON e."anilistId" = m."anilistId"
        WHERE e."episodeUrl" NOT LIKE '%tg-proxy%' 
          AND e."episodeUrl" NOT LIKE '%workers.dev%'
          AND e."episodeUrl" IS NOT NULL
          AND e."episodeUrl" != ''
          AND m.status IN ('RELEASING', 'Releasing', 'ongoing', 'Ongoing', 'ONGOING')
          AND NOT EXISTS (
              SELECT 1 FROM episodes e2 
              WHERE e2."anilistId" = e."anilistId" 
                AND e2."episodeNumber" = e."episodeNumber" 
                AND (e2."episodeUrl" LIKE '%tg-proxy%' OR e2."episodeUrl" LIKE '%workers.dev%')
          )
        ORDER BY m.popularity DESC NULLS LAST, e."anilistId", e."episodeNumber" DESC
        LIMIT 20
    """
    
    rows = await database.fetch_all(query)
    print(f"\n======================================")
    print(f"🔍 SIMULASI INGESTION ANIME ONGOING")
    print(f"======================================")
    print(f"Total pending episodes ditemukan di DB (Releasing & Belum Ingest): {len(rows)}")
    
    if not rows:
        await database.disconnect()
        return
        
    print("\nMengecek ketersediaan stream 720p...\n")
    
    valid_count = 0
    for row in rows:
        anilist_id = row['anilistId']
        episode_num = float(row['episodeNumber'])
        clean_title = row['cleanTitle'] or "Unknown"
        episode_url = row['episodeUrl']
        provider_id = row['providerId']
        
        try:
            sources_response = await stream_cache.get_stream(episode_url, provider_id)
            direct_url = ""
            
            if sources_response and "sources" in sources_response and len(sources_response["sources"]) > 0:
                for s in sources_response["sources"]:
                    if s.get("quality") == "720p" and any(t in s.get("type", "") for t in ["mp4", "direct", "hls"]):
                        direct_url = s.get("raw_url") or s.get("url", "")
                        provider_id = s.get("source", "unknown")
                        break
                        
            if direct_url and "tg-proxy" not in direct_url:
                print(f"✅ BISA DI-INGEST (720p) | Anime: {clean_title} | Ep: {episode_num} | Provider: {provider_id}")
                valid_count += 1
            else:
                print(f"❌ SKIP (Tidak ada 720p) | Anime: {clean_title} | Ep: {episode_num}")
                
        except Exception as e:
            print(f"❌ ERROR mengecek stream | Anime: {clean_title} | Ep: {episode_num} | Error: {e}")

    print(f"\nTotal siap di-ingest (Ada 720p): {valid_count} dari {len(rows)} sampel yang dicek.")
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(dry_run())