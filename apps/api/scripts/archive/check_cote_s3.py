import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath('.'))
from db.connection import database

async def main():
    await database.connect()
    
    # Cari AniList ID untuk COTE S3
    anime = await database.fetch_one(
        "SELECT \"anilistId\", \"cleanTitle\" FROM anime_metadata WHERE \"cleanTitle\" ILIKE '%Classroom of the Elite%Season 3%' LIMIT 1"
    )
    
    if not anime:
        print("Anime COTE S3 not found in database.")
        await database.disconnect()
        return
        
    aid = anime["anilistId"]
    title = anime["cleanTitle"]
    print(f"Found Anime: {title} (AniList ID: {aid})")
    
    # Hitung jumlah episode yang BUKAN tele-proxy
    query = """
        SELECT "episodeNumber", "episodeUrl" 
        FROM episodes 
        WHERE "anilistId" = :aid
    """
    episodes = await database.fetch_all(query, {"aid": aid})
    
    missing = []
    for ep in episodes:
        url = ep["episodeUrl"]
        # Bisa jadi None atau tidak mengandung tele-proxy
        if not url or "tele-proxy" not in url:
            missing.append(ep["episodeNumber"])
            
    print(f"Total episodes in DB: {len(episodes)}")
    print(f"Episodes without tele-proxy ({len(missing)}): {sorted(missing)}")
    
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
