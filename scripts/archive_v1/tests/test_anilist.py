import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "apps", "api")))
from services.anilist import fetch_anilist_info_by_id
async def main():
    media = await fetch_anilist_info_by_id(105333)
    print(media.keys())
asyncio.run(main())
