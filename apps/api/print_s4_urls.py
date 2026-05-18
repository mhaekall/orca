import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath('.'))
from db.connection import database

async def main():
    await database.connect()
    
    episodes = await database.fetch_all(
        'SELECT "episodeNumber", "episodeUrl" FROM episodes WHERE "anilistId" = 180745 ORDER BY "episodeNumber"'
    )
    
    print("Current DB URLs for COTE S4:")
    for ep in episodes:
        print(f"Ep {ep['episodeNumber']}: {ep['episodeUrl']}")
        
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
