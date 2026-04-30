import asyncio
import sys
import os

# Root directory
sys.path.insert(0, "/data/data/com.termux/files/home/workspace/anime-scraper-pro/services/scraper")
sys.path.append("/data/data/com.termux/files/home/workspace/anime-scraper-pro/apps/api")

from dotenv import load_dotenv
load_dotenv("/data/data/com.termux/files/home/workspace/anime-scraper-pro/apps/api/.env")

from providers.samehadaku.provider import SamehadakuProvider
from services.transport import ProviderTransport

async def test_samehadaku():
    url = "https://v2.samehadaku.how/higeki-no-genkyou-to-naru-saikyou-season-2-episode-4/"
    print(f"Testing Samehadaku URL: {url}")
    
    transport = ProviderTransport()
    provider = SamehadakuProvider(transport)
    result = await provider.get_episode_sources(url)
    
    print("\nExtracted Sources:")
    if result and "sources" in result:
        for s in result["sources"]:
            print(f"  - {s.get('source')} | {s.get('quality')} | {s.get('type')} | URL: {s.get('raw_url') or s.get('url')[:100]}...")
    else:
        print("  [-] No sources found.")
        print(f"Raw result: {result}")

if __name__ == "__main__":
    asyncio.run(test_samehadaku())