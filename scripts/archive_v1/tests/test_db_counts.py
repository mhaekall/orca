import asyncio
from dotenv import load_dotenv
import os
import asyncpg

load_dotenv(dotenv_path="apps/api/.env")

async def main():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    try:
        total_anime = await conn.fetchval('SELECT COUNT(*) FROM anime_metadata')
        anime_with_eps = await conn.fetchval('SELECT COUNT(DISTINCT "anilistId") FROM episodes')
        total_eps = await conn.fetchval('SELECT COUNT(*) FROM episodes')
        print(f"Total anime titles: {total_anime}")
        print(f"Anime with episodes: {anime_with_eps}")
        print(f"Total episodes: {total_eps}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await conn.close()

asyncio.run(main())
