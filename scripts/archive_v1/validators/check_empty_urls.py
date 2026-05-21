import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv(dotenv_path="apps/api/.env")

async def main():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    try:
        empty = await conn.fetchval('SELECT COUNT(*) FROM episodes WHERE "episodeUrl" IS NULL OR "episodeUrl" = \'\'')
        print(f"Episodes with empty URLs: {empty}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await conn.close()

asyncio.run(main())
