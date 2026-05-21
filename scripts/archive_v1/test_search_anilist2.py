import asyncio
from services.anilist import fetch_anilist_info_by_id, fetch_anilist_manga_by_id

async def main():
    m = await fetch_anilist_manga_by_id(180891)
    print("Manga:", m["title"], m["cleanTitle"], m["nativeTitle"])

asyncio.run(main())