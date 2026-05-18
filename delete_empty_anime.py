import asyncio
from dotenv import load_dotenv
import os
import asyncpg

load_dotenv(dotenv_path="apps/api/.env")

async def main():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    try:
        # Delete from anime_metadata where anilistId is not in episodes table
        result = await conn.execute("""
            DELETE FROM anime_metadata 
            WHERE "anilistId" NOT IN (
                SELECT DISTINCT "anilistId" FROM episodes
            )
        """)
        print(f"Delete result: {result}")
        
        # Verify the remaining count
        total_anime = await conn.fetchval('SELECT COUNT(*) FROM anime_metadata')
        print(f"Remaining anime titles: {total_anime}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await conn.close()

asyncio.run(main())
