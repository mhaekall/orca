import asyncio
import os
from databases import Database
from dotenv import load_dotenv

load_dotenv("apps/api/.env")

async def main():
    db = Database(os.getenv("DATABASE_URL"))
    await db.connect()
    
    rows = await db.fetch_all("""
        SELECT e."episodeNumber", e."episodeUrl" 
        FROM episodes e
        WHERE e."episodeUrl" LIKE '%bot8661115912:AAEc1VN%'
        LIMIT 1
    """)
    
    for row in rows:
        print(f"Eps {row['episodeNumber']}: {row['episodeUrl']}")

    await db.disconnect()

asyncio.run(main())
