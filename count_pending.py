import asyncio
from dotenv import load_dotenv
load_dotenv("apps/api/.env")
from apps.api.db.connection import database

async def main():
    await database.connect()
    
    # Query ini menggunakan filter yang sama persis dengan mesin Ingestion 
    # (Hanya yang sudah ada di video_cache/L2 dan kadaluwarsanya masih aktif)
    query = """
        SELECT COUNT(e.id) as total
        FROM episodes e
        JOIN video_cache vc ON e."episodeUrl" = vc."episodeUrl"
        WHERE e."episodeUrl" NOT LIKE '%tg-proxy%' 
          AND e."episodeUrl" NOT LIKE '%workers.dev%'
          AND e."episodeUrl" IS NOT NULL
          AND e."episodeUrl" != ''
          AND vc."expiresAt" > NOW()
          AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(vc."payload"->'sources') AS s
              WHERE s->>'quality' = '720p'
                AND s->>'type' IN ('mp4', 'direct', 'hls', 'mp4 (direct)', 'hls (direct)')
          )
          AND NOT EXISTS (
              SELECT 1 FROM episodes e2 
              WHERE e2."anilistId" = e."anilistId" 
                AND e2."episodeNumber" = e."episodeNumber" 
                AND (e2."episodeUrl" LIKE '%tg-proxy%' OR e2."episodeUrl" LIKE '%workers.dev%')
          )
    """
    total_res = await database.fetch_val(query)
    print(f"Total Target Real Ingest (Di-cache & Belum Proxy): {total_res}")
    
    await database.disconnect()

asyncio.run(main())
