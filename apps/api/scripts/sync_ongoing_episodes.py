import asyncio
import logging
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.connection import database
from services.pipeline import sync_anime_episodes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def sync_ongoing_episodes():
    await database.connect()
    try:
        # Get all anilistIds that are currently RELEASING
        query = """
            SELECT m."anilistId", m."cleanTitle"
            FROM anime_metadata m
            WHERE m.status IN ('RELEASING', 'Releasing', 'ongoing', 'Ongoing', 'ONGOING')
            ORDER BY m.popularity DESC NULLS LAST
        """
        rows = await database.fetch_all(query)
        anilist_ids = [row["anilistId"] for row in rows]

        logger.info(f"Found {len(anilist_ids)} ongoing animes to resync. Starting sync...")

        sem = asyncio.Semaphore(5)

        async def sync_one(aid: int, title: str):
            async with sem:
                logger.info(f"Syncing ongoing anime: {title} (ID: {aid})")
                try:
                    await sync_anime_episodes(aid)
                except Exception as e:
                    logger.error(f"Failed to sync {title} ({aid}): {e}")

        # Process in chunks
        chunk_size = 20
        for i in range(0, len(anilist_ids), chunk_size):
            chunk = rows[i : i + chunk_size]
            tasks = [sync_one(r["anilistId"], r["cleanTitle"]) for r in chunk]
            await asyncio.gather(*tasks)
            await asyncio.sleep(1)

        logger.info("Ongoing episodes sync completed successfully!")
    finally:
        await database.disconnect()


if __name__ == "__main__":
    asyncio.run(sync_ongoing_episodes())
