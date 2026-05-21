import asyncio
from apps.api.services.anilist import fetch_anilist_manga_home

async def main():
    res = await fetch_anilist_manga_home()
    if res and res["trending"]:
        hero = res["trending"][0]
        print("cleanTitle:", hero["cleanTitle"])
        print("nativeTitle:", hero["nativeTitle"])
        
asyncio.run(main())
