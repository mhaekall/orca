import asyncio
from apps.api.services.anilist import fetch_anilist_manga_by_id

async def main():
    # ID for The Regressed Mercenary (we know it from previous test: 182066 or 180891? Let's check 180891)
    m = await fetch_anilist_manga_by_id(180891)
    if m:
        print("Chapters list length:", len(m.get("chapters", [])))
        print("Chapters content:", m.get("chapters", []))
    else:
        print("Manga not found")

asyncio.run(main())
