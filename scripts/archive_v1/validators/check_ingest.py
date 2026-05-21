import asyncio
from dotenv import load_dotenv
import os
import asyncpg

load_dotenv(dotenv_path="apps/api/.env")

async def main():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    try:
        row = await conn.fetchrow("""
            SELECT "episodeUrl" FROM episodes WHERE "anilistId" = 98659 AND "episodeNumber" = 10
        """)
        print(f"Episode URL: {row['episodeUrl'] if row else 'Not found'}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await conn.close()

asyncio.run(main())
