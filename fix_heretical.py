import asyncio
import os
from databases import Database
from dotenv import load_dotenv

load_dotenv("apps/api/.env")

async def main():
    db = Database(os.getenv("DATABASE_URL"))
    await db.connect()
    
    # Check how many episodes have tg-proxy-4 or tg-proxy-2
    rows = await db.fetch_all("""
        SELECT COUNT(*) as count
        FROM episodes
        WHERE "episodeUrl" LIKE '%tg-proxy-4%' OR "episodeUrl" LIKE '%tg-proxy-2%'
    """)
    print(f"Found {rows[0]['count']} dead links from tg-proxy-4/2")

    await db.disconnect()

asyncio.run(main())
