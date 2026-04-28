import asyncio
import sys
import os
import httpx
import logging
import argparse

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv

load_dotenv()

from db.connection import database
from services.cache import upstash_get, upstash_set, upstash_del
from services.ingestion.main import IngestionEngine
from services.stream_cache import get_cached_stream

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def ingest_pending(limit: int, shard_id: int = 0, total_shards: int = 1):
    await database.connect()
    
    logger.info(f"Looking for up to {limit} pending episodes to ingest...")
    
    # We find episodes that do not have tg-proxy or workers.dev in their URL
    # We prioritize popular anime
    query = """
        SELECT e.id, e."anilistId", e."episodeNumber", m."cleanTitle"
        FROM episodes e
        JOIN anime_metadata m ON e."anilistId" = m."anilistId"
        WHERE e."episodeUrl" NOT LIKE '%tg-proxy%' 
          AND e."episodeUrl" NOT LIKE '%workers.dev%'
          AND e."episodeUrl" IS NOT NULL
          AND e."episodeUrl" != ''
        ORDER BY m.popularity DESC NULLS LAST, e."anilistId", e."episodeNumber" DESC
        LIMIT :limit
    """
    
    rows = await database.fetch_all(query, {"limit": limit})
    if not rows:
        logger.info("No pending episodes found.")
        await database.disconnect()
        return

    logger.info(f"Found {len(rows)} pending episodes.")
    
    engine = IngestionEngine()

    async with httpx.AsyncClient(timeout=30.0) as client:
        for idx, row in enumerate(rows):
            ep_id = row['id']
            anilist_id = row['anilistId']
            episode_num = float(row['episodeNumber'])
            clean_title = row['cleanTitle'] or "Unknown"
            
            # Check if currently locked
            lock_key = f"ingest:{anilist_id}:{episode_num}"
            is_locked = await upstash_get(lock_key)
            if is_locked:
                logger.info(f"Skipping Anime: {anilist_id} Ep {episode_num} because it is currently locked (running).")
                continue

            logger.info(f"Processing Anime: {anilist_id} Ep {episode_num} ({clean_title})")
            
            # Lock it for 2 hours to prevent concurrent ingestion
            await upstash_set(lock_key, "1", ex=7200)
            
            try:
                sources_response = await get_cached_stream(anilist_id, episode_num)
                direct_url = ""
                provider_id = "unknown"
                
                if sources_response and "sources" in sources_response and len(sources_response["sources"]) > 0:
                    # Prefer 720p mp4/direct/hls
                    for s in sources_response["sources"]:
                        if s.get("quality") == "720p" and s.get("type") in ["mp4", "direct", "hls"]:
                            direct_url = s.get("raw_url") or s.get("url", "")
                            provider_id = s.get("source", "unknown")
                            quality_picked = s.get("quality", "720p")
                            break
                    
                    if not direct_url:
                        for s in sources_response["sources"]:
                            if s.get("type") in ["mp4", "direct", "hls"]:
                                direct_url = s.get("raw_url") or s.get("url", "")
                                provider_id = s.get("source", "unknown")
                                quality_picked = s.get("quality", "Auto")
                                break
                                
                    if not direct_url:
                        direct_url = sources_response["sources"][0].get("raw_url") or sources_response["sources"][0].get("url", "")
                        provider_id = sources_response["sources"][0].get("source", "unknown")
                        quality_picked = sources_response["sources"][0].get("quality", "Auto")
                
                if direct_url and "tg-proxy" not in direct_url:
                    # Only process if we found a direct stream URL that isn't already ingested
                    logger.info(f"Found stream from {provider_id} ({quality_picked}), triggering ingestion...")
                    success = await engine.process_episode(
                        episode_id=ep_id,
                        anilist_id=anilist_id,
                        provider_id=provider_id,
                        episode_number=episode_num,
                        direct_video_url=direct_url,
                        anime_title=clean_title,
                        video_quality=quality_picked
                    )
                    logger.info(f"Ingest Result {anilist_id} Ep {episode_num}: {success}")
                    
                    if success and idx < len(rows) - 1:
                        # Wait 5 minutes between successful ingestions to avoid rate limits
                        logger.info("Waiting 5 minutes before next episode to avoid rate limits...")
                        await asyncio.sleep(300)
                else:
                    logger.error(f"Could not resolve valid direct URL for retry {anilist_id} Ep {episode_num}")
            except Exception as e:
                logger.error(f"Error during ingestion of {anilist_id} Ep {episode_num}: {e}")
            finally:
                # We do not delete the lock here immediately if it failed? 
                # Actually IngestionEngine should clear it, but just in case:
                # We let IngestionEngine clear it on success or let it expire
                pass

    logger.info("Pending ingestion batch completed.")
    await database.disconnect()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=10, help="Max episodes to process")
    args = parser.parse_args()
    
    asyncio.run(ingest_pending(args.limit))
