import asyncio
from apps.api.services.anilist import check_manga_availability

async def main():
    sem = asyncio.Semaphore(1)
    # Coba cek judul "One Piece"
    is_valid, ch = await check_manga_availability("One Piece", sem)
    print(f"One Piece: Valid={is_valid}, Chapter={ch}")

asyncio.run(main())
