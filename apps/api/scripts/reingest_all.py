import asyncio

from dotenv import load_dotenv

load_dotenv("apps/api/.env")

# The 73 IDs that I "fixed" but actually corrupted.
fixed_ids = [94889, 25128, 25101, 25123, 25129, 25114, 25124, 231313, 25098, 25121, 25104, 231312, 25122, 25112, 25100, 25099, 295571, 25125, 25111, 25113, 376083, 25102, 179039, 52357, 28058, 26524, 175366, 158257, 25115, 198101, 16667, 376082, 1158, 376085, 94721, 25657, 16666, 25105, 376115, 376078, 16662, 189753, 26098, 376086, 22647, 376081, 376089, 207702, 25665, 28053, 25699, 25698, 28054, 28055, 21444, 376090, 28041, 28048, 25666, 222502, 16668, 28044, 21432, 376077, 21469, 28043, 28045, 28047, 116596, 28056, 373499, 94828, 94890]

async def main():
    from db.connection import database as global_db
    await global_db.connect()
    db = global_db

    query = """
    SELECT id, "anilistId", "episodeNumber"
    FROM episodes
    WHERE id = ANY(:ids)
    """

    rows = await db.fetch_all(query, {"ids": fixed_ids})
    print(f"Found {len(rows)} episodes to re-ingest.")

    from scripts.ingest_pending import ingest_pending
    from services.cache import upstash_del
    from services.pipeline import sync_anime_episodes

    for i, r in enumerate(rows):
        ep_id = r["id"]
        aid = r["anilistId"]
        ep_num = r["episodeNumber"]

        print(f"[{i+1}/{len(rows)}] Reingesting Anime {aid} Ep {ep_num} (ID: {ep_id})...")
        try:
            # Delete cache so it doesn't return old broken URL
            await db.execute('DELETE FROM video_cache WHERE "episodeUrl" = (SELECT "episodeUrl" FROM episodes WHERE id = :id)', {"id": ep_id})

            # Clear Redis locks
            await upstash_del(f"ingest:{aid}:{ep_num}")
            await upstash_del(f"ingest_progress:{aid}:{ep_num}")

            # Set URL to dummy so pipeline overwrites it with real provider URL
            await db.execute('UPDATE episodes SET "episodeUrl" = :dummy WHERE id = :id', {"dummy": "http://dummy", "id": ep_id})

            # Sync sources
            await sync_anime_episodes(aid)

            # Trigger ingest exactly for this episode
            await ingest_pending(1, anilist_id=str(aid), ep_num=str(ep_num))
            print("✅ Success.")
        except Exception as e:
            print(f"❌ Error: {e}")

    await db.disconnect()

asyncio.run(main())
