import asyncio
import json
from apps.api.db.connection import database
from apps.api.services.stream_cache import stream_cache

async def main():
    await database.connect()
    res = await database.fetch_one('SELECT "episodeUrl", "providerId" FROM episodes WHERE anilist_id = 145545 AND ep_num = 12 LIMIT 1')
    print("DB Row:", res)
    await database.disconnect()
    
    if res:
        url = res["episodeUrl"]
        pid = res["providerId"]
        stream = await stream_cache.get_stream(url, pid)
        print(json.dumps(stream, indent=2))

asyncio.run(main())
