import argparse
import asyncio
import logging
import os
import sys

import httpx

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv

load_dotenv()

from services.ingestion.main import IngestionEngine

from db.connection import database
from services.cache import upstash_del, upstash_get, upstash_set
from services.stream_cache import stream_cache

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def ingest_pending(
    limit: int, shard_id: int = 0, total_shards: int = 1, anilist_id: str = None, ep_num: str = None
):
    await database.connect()

    if anilist_id and ep_num:
        logger.info(f"Targeted ingestion for Anime ID: {anilist_id}, Episode: {ep_num}")
        query = """
            SELECT e.id, e."anilistId", e."episodeNumber", m."cleanTitle", e."episodeUrl", e."providerId"
            FROM episodes e
            JOIN anime_metadata m ON e."anilistId" = m."anilistId"
            WHERE e."anilistId" = :aid AND e."episodeNumber" = :ep
        """
        rows = await database.fetch_all(query, {"aid": int(anilist_id), "ep": float(ep_num)})
    else:
        logger.info(f"Looking for up to {limit} pending episodes to ingest...")

        # We find episodes that do not have tg-proxy or workers.dev in their URL
        # We prioritize popular anime AND ONLY pick those that are already in video_cache (warmed up)
        query = """
            SELECT e.id, e."anilistId", e."episodeNumber", m."cleanTitle", e."episodeUrl", e."providerId"
            FROM episodes e
            JOIN anime_metadata m ON e."anilistId" = m."anilistId"
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
            ep_id = row["id"]
            anilist_id = row["anilistId"]
            episode_num = float(row["episodeNumber"])
            clean_title = row["cleanTitle"] or "Unknown"

            # Check if currently locked
            lock_key = f"ingest:{anilist_id}:{episode_num}"
            is_locked = await upstash_get(lock_key)
            if is_locked:
                logger.info(
                    f"Skipping Anime: {anilist_id} Ep {episode_num} because it is currently locked (running)."
                )
                continue

            logger.info(f"Processing Anime: {anilist_id} Ep {episode_num} ({clean_title})")

            # Lock it for 2 hours to prevent concurrent ingestion
            await upstash_set(lock_key, "1", ex=7200)

            try:
                sources_response = await stream_cache.get_stream(
                    row["episodeUrl"], row["providerId"]
                )
                direct_url = ""
                provider_id = row["providerId"]

                if (
                    sources_response
                    and "sources" in sources_response
                    and len(sources_response["sources"]) > 0
                ):
                    # STRICTLY 720p only
                    for s in sources_response["sources"]:
                        if s.get("quality") == "720p" and any(
                            t in s.get("type", "") for t in ["mp4", "direct", "hls"]
                        ):
                            direct_url = s.get("raw_url") or s.get("url", "")
                            provider_id = s.get("source", "unknown")
                            quality_picked = "720p"
                            break

                if not direct_url:
                    logger.warning(
                        f"Could not resolve 720p direct URL for {anilist_id} Ep {episode_num}. Skipping."
                    )
                    await upstash_del(lock_key)
                    continue

                if direct_url and "tg-proxy" not in direct_url:
                    # Only process if we found a direct stream URL that isn't already ingested
                    logger.info(
                        f"Found stream from {provider_id} ({quality_picked}), triggering ingestion..."
                    )
                    success = await engine.process_episode(
                        episode_id=ep_id,
                        anilist_id=anilist_id,
                        provider_id=provider_id,
                        episode_number=episode_num,
                        direct_video_url=direct_url,
                        anime_title=clean_title,
                        video_quality=quality_picked,
                    )
                    logger.info(f"Ingest Result {anilist_id} Ep {episode_num}: {success}")

                    if success and idx < len(rows) - 1:
                        # Wait 1 minute between successful ingestions to avoid rate limits
                        logger.info("Waiting 1 minute before next episode to avoid rate limits...")
                        await asyncio.sleep(60)
                else:
                    logger.error(
                        f"Could not resolve valid direct URL for retry {anilist_id} Ep {episode_num}"
                    )
                    await upstash_del(lock_key)
            except Exception as e:
                logger.error(f"Error during ingestion of {anilist_id} Ep {episode_num}: {e}")
                await upstash_del(lock_key)
            finally:
                pass

    logger.info("Pending ingestion batch completed.")
    await database.disconnect()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=10, help="Max episodes to process")
    parser.add_argument("--anilist_id", type=str, help="Specific Anilist ID to ingest")
    parser.add_argument("--ep_num", type=str, help="Specific episode number to ingest")
    args = parser.parse_args()

    asyncio.run(ingest_pending(args.limit, anilist_id=args.anilist_id, ep_num=args.ep_num))
