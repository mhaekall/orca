import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.connection import database
from services.db import upsert_mapping_atomic
from services.pipeline import sync_anime_episodes

async def map_and_sync(aid, provider, slug, title):
    print(f"Mapping {title} to {provider}/{slug}")
    await upsert_mapping_atomic(
        anilist_id=aid,
        provider_id=provider,
        provider_slug=slug,
        clean_title=title,
        cover_image=""
    )
    print(f"Syncing episodes for {title}...")
    await sync_anime_episodes(aid)

async def main():
    await database.connect()
    
    # Dr. STONE: STONE WARS (Season 2)
    await map_and_sync(113936, "otakudesu", "drstn-s2-sub-indo", "Dr. STONE: STONE WARS")
    
    # Dr. STONE New World (Season 3 Part 1)
    await map_and_sync(131518, "otakudesu", "drstn-s3-sub-indo", "Dr. STONE New World")
    
    # Dr. STONE New World Part 2 (Season 3 Part 2)
    await map_and_sync(162670, "otakudesu", "drstne-s3-p2-sub-indo", "Dr. STONE New World Part 2")
    
    # Dr. STONE SCIENCE FUTURE (Season 4 Part 1) -> already 31 episodes maybe wrong? Let's fix if needed, but keeping it for now
    
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
