import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv('apps/api/.env')

async def main():
    c = await asyncpg.connect(os.environ['DATABASE_URL'])
    rows = await c.fetch("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('anime_metadata', 'episodes', 'stream_sources')")
    for r in rows:
        print(dict(r))
    await c.close()

if __name__ == '__main__':
    asyncio.run(main())
