import asyncio
from apps.api.services.anilist import fetch_anilist_manga_by_id

async def main():
    res = await fetch_anilist_manga_by_id(132029)
    print(res)

asyncio.run(main())
