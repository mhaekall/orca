import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath('.'))
from db.connection import database

async def main():
    await database.connect()
    
    res = await database.fetch_all("SELECT column_name FROM information_schema.columns WHERE table_name='titles'")
    print([r['column_name'] for r in res])
    
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
