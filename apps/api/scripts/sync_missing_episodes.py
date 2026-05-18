import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.connection import database
from services.db import upsert_mapping_atomic
from services.pipeline import PROVIDERS, sync_anime_episodes

async def sync_missing_episodes():
    print("🚀 Starting Sync for Anime with 0 Episodes...")

    query = """
        SELECT m."anilistId", m."cleanTitle", m."coverImage"
        FROM anime_metadata m
        LEFT JOIN episodes e ON m."anilistId" = e."anilistId"
        GROUP BY m."anilistId", m."cleanTitle", m."coverImage"
        HAVING COUNT(e.id) = 0
    """
    missing_media = await database.fetch_all(query)

    if not missing_media:
        print("❌ No anime without episodes found.")
        return

    print(f"Found {len(missing_media)} anime without episodes. Processing...")

    for media in missing_media:
        aid = media["anilistId"]
        title = media["cleanTitle"]
        cover = media["coverImage"]
        print(f"\nProcessing: {title} (ID: {aid})")

        # 1. Check existing mappings
        existing = await database.fetch_all(
            'SELECT * FROM anime_mappings WHERE "anilistId" = :id', {"id": aid}
        )
        if existing:
            print("  -> Already mapped. Triggering episode sync...")
            await sync_anime_episodes(aid)
            continue

        # 2. No mappings found, search providers
        found_mapping = False
        for prov_id, provider in PROVIDERS.items():
            if not hasattr(provider, "search"):
                continue

            print(f"  -> Searching {prov_id} for '{title}'...")
            try:
                # Use a timeout so one provider doesn't hang the whole script
                async with asyncio.timeout(10.0):
                    search_results = await provider.search(title)

                if search_results:
                    best_match = search_results[0]
                    # Extract slug from URL depending on provider structure
                    url = best_match["url"].strip("/")
                    slug = url.split("/")[-1]

                    if slug:
                        print(f"     ✅ Found match on {prov_id}: {slug}")
                        await upsert_mapping_atomic(
                            anilist_id=aid,
                            provider_id=prov_id,
                            provider_slug=slug,
                            clean_title=title,
                            cover_image=cover,
                        )
                        found_mapping = True
                        break  # Found one good mapping, break out of provider loop
            except Exception as e:
                print(f"     ❌ Search error on {prov_id}: {e}")

        if found_mapping:
            print("  -> Mapping saved. Triggering episode sync...")
            await sync_anime_episodes(aid)
        else:
            print(f"  -> ⚠️ Could not find any provider mappings for {title}")

    print("\n✅ Sync Missing Episodes Finished.")


async def main():
    await database.connect()
    await sync_missing_episodes()
    await database.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
