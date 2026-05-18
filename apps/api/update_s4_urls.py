import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath('.'))
from db.connection import database

async def main():
    await database.connect()
    
    anilist_id = 180745
    eps_to_update = [2, 3, 5, 6]
    
    print("Updating database to use Kuronime for COTE S4 missing episodes...")
    for ep in eps_to_update:
        url = f"https://kuronime.sbs/nonton-youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e-season-4-episode-{ep}/"
        query = """
            UPDATE episodes 
            SET "episodeUrl" = :url, "providerId" = 'kuronime' 
            WHERE "anilistId" = :aid AND "episodeNumber" = :ep
        """
        await database.execute(query, {"url": url, "aid": anilist_id, "ep": ep})
        print(f"Updated Ep {ep} -> {url}")
        
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
