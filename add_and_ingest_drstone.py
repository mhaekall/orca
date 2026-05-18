import asyncio
import os
import sys

# Set paths
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "apps", "api")))
from dotenv import load_dotenv

load_dotenv("apps/api/.env")

async def main():
    from db.connection import database as db
    await db.connect()
    
    from services.anilist import fetch_anilist_info_by_id
    from services.db import upsert_anime_db, upsert_mapping_atomic
    from services.pipeline import sync_anime_episodes
    from scripts.ingest_pending import ingest_pending
    from services.cache import upstash_del
    
    aid = 105333
    print(f"Fetching metadata from AniList for ID {aid}...")
    media = await fetch_anilist_info_by_id(aid)
    if not media:
        print("Failed to fetch metadata from AniList.")
        await db.disconnect()
        return

    # Upsert basic metadata
    print("Upserting anime metadata to DB...")
    await upsert_anime_db(media, "anilist_sync", str(aid))

    print("Forcing mapping to otakudesu / drstne-sub-indo")
    await upsert_mapping_atomic(
        anilist_id=aid,
        provider_id="otakudesu",
        provider_slug="drstne-sub-indo",
        clean_title=media.get("cleanTitle"),
        cover_image=media.get("hdImage"),
    )

    print("Deleting non-otakudesu episodes to avoid duplicates...")
    await db.execute('DELETE FROM episodes WHERE "anilistId" = :aid AND "providerId" != :pid', {"aid": aid, "pid": "otakudesu"})

    print(f"Syncing episodes for Dr. STONE (Anilist ID: {aid})...")
    await sync_anime_episodes(aid)
    
    query = """
    SELECT "episodeNumber", "episodeUrl"
    FROM episodes
    WHERE "anilistId" = :aid
    ORDER BY "episodeNumber" ASC
    """
    
    rows = await db.fetch_all(query, {"aid": aid})
    print(f"Found {len(rows)} episodes in database.")
    
    for r in rows:
        ep_num = float(r["episodeNumber"])
        ep_url = r["episodeUrl"]
        
        # Check if already ingested (has tg-proxy or workers.dev)
        if ep_url and ("tg-proxy" in ep_url or "workers.dev" in ep_url):
            print(f"Episode {ep_num} is already ingested. Skipping.")
            continue
            
        print(f"\n[MARATHON] Ingesting Dr. STONE Ep {ep_num}...")
        try:
            # Clear stream cache to force a fresh fetch
            await db.execute('DELETE FROM video_cache WHERE "episodeUrl" = :url', {"url": ep_url})
            await upstash_del(f"stream:v3:{ep_url}")

            # Clear Redis locks
            await upstash_del(f"ingest:{aid}:{ep_num}")
            await upstash_del(f"ingest_progress:{aid}:{ep_num}")
            
            # Trigger ingest exactly for this episode
            await ingest_pending(1, anilist_id=str(aid), ep_num=str(ep_num))
            
            # Wait a few seconds
            await asyncio.sleep(5)
            
        except Exception as e:
            print(f"❌ Error during episode {ep_num}: {e}")

    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
