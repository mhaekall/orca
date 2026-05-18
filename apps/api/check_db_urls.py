import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath('.'))
from db.connection import database

async def main():
    await database.connect()
    
    res = await database.fetch_all('SELECT id, "providerId", "episodeNumber", "episodeUrl" FROM episodes WHERE "anilistId" = 180745 AND "episodeNumber" IN (2, 3, 5, 6)')
    print("DB URLs for S4 Ep 2,3,5,6:")
    for r in res:
        print(dict(r))
        
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())