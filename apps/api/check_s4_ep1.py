import asyncio
import json
import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from db.connection import database
from services.stream_cache import stream_cache

async def main():
    await database.connect()
    res = await database.fetch_one('SELECT "episodeUrl", "providerId" FROM episodes WHERE "anilistId" = 180745 AND "episodeNumber" = 1 LIMIT 1')
    await database.disconnect()
    
    if res:
        url = res["episodeUrl"]
        pid = res["providerId"]
        stream = await stream_cache.get_stream(url, pid)
        print(json.dumps(stream, indent=2))
    else:
        print("Not found in db")

asyncio.run(main())
