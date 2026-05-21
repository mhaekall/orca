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
            SELECT e."anilistId", e."episodeNumber", m."cleanTitle"
            FROM episodes e 
            JOIN anime_metadata m ON e."anilistId" = m."anilistId"
            WHERE e."episodeUrl" LIKE '%tele-proxy%'
            LIMIT 1
        """))
        row = res.fetchone()
        if row:
            aid, ep_num, title = row
            print(f"Target: {title} Eps {ep_num}")
            
            # Insert a dummy kuronime URL just to see if client parses it
            # We will use the frieren episode 5 URL we know works, just as a dummy provider URL
            # The client will scrape this Kuronime URL and combine its sources with the tele-proxy source
            
            dummy_url = "https://kuronime.sbs/nonton-sousou-no-frieren-episode-5/"
            
            # check if exists
            check = await conn.execute(text('SELECT id FROM episodes WHERE "anilistId"=:aid AND "episodeNumber"=:ep AND "providerId"=:pid'), 
                {"aid": aid, "ep": ep_num, "pid": "kuronime_test"})
            
            if not check.fetchone():
                await conn.execute(text("""
                    INSERT INTO episodes ("anilistId", "providerId", "episodeNumber", "episodeUrl", "updatedAt")
                    VALUES (:aid, :pid, :ep, :url, NOW())
                """), {"aid": aid, "pid": "kuronime_test", "ep": ep_num, "url": dummy_url})
                await conn.commit()
                print("Inserted dummy provider URL.")
            else:
                print("Dummy provider URL already exists.")

if __name__ == "__main__":
    asyncio.run(main())
