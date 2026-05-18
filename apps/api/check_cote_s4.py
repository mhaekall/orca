import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath('.'))
from db.connection import database

async def main():
    await database.connect()
    
    # Cari AniList ID untuk COTE S4 (atau mungkin pakai Second Year First Semester dsb)
    query = """
        SELECT "anilistId", "cleanTitle" 
        FROM anime_metadata 
        WHERE "cleanTitle" ILIKE '%Classroom of the Elite%Season 4%' 
           OR "cleanTitle" ILIKE '%Classroom of the Elite%4th Season%'
        LIMIT 1
    """
    anime = await database.fetch_one(query)
    
    if not anime:
        print("Anime COTE S4 not found in database.")
        await database.disconnect()
        return
        
    aid = anime["anilistId"]
    title = anime["cleanTitle"]
    print(f"Found Anime: {title} (AniList ID: {aid})")
    
    # Hitung jumlah episode yang BUKAN tele-proxy
    episodes = await database.fetch_all(
        'SELECT "episodeNumber", "episodeUrl" FROM episodes WHERE "anilistId" = :aid',
        {"aid": aid}
    )
    
    missing = set()
    for ep in episodes:
        url = ep["episodeUrl"]
        # Bisa jadi None atau tidak mengandung tele-proxy
        if not url or "tele-proxy" not in url:
            missing.add(ep["episodeNumber"])
            
    print(f"Total episodes in DB: {len(episodes)}")
    missing_list = sorted(list(missing))
    print(f"Unique Episodes without tele-proxy ({len(missing_list)}): {missing_list}")
    
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
