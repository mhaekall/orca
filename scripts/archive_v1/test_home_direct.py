import asyncio
from apps.api.services.anilist import fetch_anilist_manga_home

async def main():
    res = await fetch_anilist_manga_home()
    if res:
        print("Trending:", [m["cleanTitle"] for m in res.get("trending", [])])
        print("Popular:", [m["cleanTitle"] for m in res.get("popular", [])])

asyncio.run(main())
