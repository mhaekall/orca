import asyncio
import os
from databases import Database
from dotenv import load_dotenv

load_dotenv("apps/api/.env")

async def main():
    db = Database(os.getenv("DATABASE_URL"))
    await db.connect()
    
    query = """
    SELECT COUNT(*) as cnt FROM episodes WHERE "episodeUrl" LIKE '%tele-proxy%'
    """
    row = await db.fetch_one(query)
    print(f"Total tele-proxy episodes in DB: {row['cnt']}")
    
    await db.disconnect()

asyncio.run(main())