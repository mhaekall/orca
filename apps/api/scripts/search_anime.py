import asyncio
import sys
import os
import logging
import json

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv()

from db.connection import database
from services.stream_cache import get_cached_stream

logging.getLogger("httpx").setLevel(logging.WARNING)

async def search_anime():
    await database.connect()
    
    query = """
        SELECT "anilistId", "cleanTitle"
        FROM anime_metadata
        WHERE "cleanTitle" ILIKE '%heretical%' OR "cleanTitle" ILIKE '%last boss%'
        LIMIT 5
    """
    
    rows = await database.fetch_all(query)
    print("Found Anime:")
    for row in rows:
        print(f"- ID: {row['anilistId']} | Title: {row['cleanTitle']}")
        
        # Check episode 4
        try:
            print(f"  Checking stream for Episode 4.0...")
            sources_response = await get_cached_stream(row['anilistId'], 4.0)
            if sources_response and "sources" in sources_response:
                for s in sources_response["sources"]:
                    print(f"    [+] {s.get('source')} | {s.get('quality')} | {s.get('type')} | URL: {s.get('raw_url') or s.get('url')[:100]}...")
            else:
                print("    [-] No sources found.")
        except Exception as e:
            print(f"    [!] Error checking stream: {e}")

    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(search_anime())