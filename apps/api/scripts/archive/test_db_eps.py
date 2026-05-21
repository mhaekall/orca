import asyncio
import os
import sys

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.insert(0, os.path.abspath('.'))

def load_env():
    if os.path.exists('.env'):
        with open('.env') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, val = line.strip().split('=', 1)
                    os.environ[key] = val.strip('"\'')

async def main():
    load_env()
    db_url = os.getenv("DATABASE_URL")
    if db_url and db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if db_url and "?sslmode=" in db_url:
        db_url = db_url.split("?sslmode=")[0]
        
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT e."episodeUrl", e."providerId", m."cleanTitle" 
            FROM episodes e 
            JOIN anime_metadata m ON e."anilistId" = m."anilistId"
            WHERE m."cleanTitle" ILIKE '%frieren%'
            LIMIT 5
        """))
        print("Frieren Episodes:", res.fetchall())
        
        res2 = await conn.execute(text("""
            SELECT "episodeUrl" FROM episodes WHERE "episodeUrl" LIKE '%tele-proxy%' LIMIT 5
        """))
        print("\nTele Proxy Episodes:", res2.fetchall())

if __name__ == "__main__":
    asyncio.run(main())
