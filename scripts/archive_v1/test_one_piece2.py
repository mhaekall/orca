import asyncio
from apps.api.services.anilist import check_manga_availability

async def main():
    sem = asyncio.Semaphore(5)
    valid, ch = await check_manga_availability("One Piece", sem)
    print("One Piece:", valid, ch)

asyncio.run(main())
