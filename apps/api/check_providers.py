import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from db.connection import database

async def main():
    await database.connect()
    res = await database.fetch_all('SELECT "episodeUrl", "providerId" FROM episodes WHERE "anilistId" = 145545 AND "episodeNumber" = 12')
    print("Providers:")
    for r in res:
        print(f"- {r['providerId']}: {r['episodeUrl']}")
    await database.disconnect()

asyncio.run(main())
