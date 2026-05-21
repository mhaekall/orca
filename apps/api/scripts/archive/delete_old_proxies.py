import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath('.'))
from db.connection import database

async def main():
    await database.connect()
    
    print("Deleting old tg-proxy rows for COTE S4...")
    query = """
        DELETE FROM episodes 
        WHERE "anilistId" = 180745 
          AND "episodeUrl" LIKE '%tg-proxy%'
    """
    result = await database.execute(query)
    print(f"Deleted rows: {result}")
    
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
