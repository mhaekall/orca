import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath('.'))
from db.connection import database

async def main():
    await database.connect()
    res = await database.fetch_one('SELECT id, "episodeNumber", "episodeUrl", "providerId" FROM episodes WHERE "anilistId" = 180745 AND "episodeNumber" = 3')
    print(dict(res) if res else 'Not found')
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())