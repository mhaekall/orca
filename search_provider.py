import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "apps", "api")))
from services.scraper.providers.samehadaku.provider import SamehadakuProvider
from services.transport import ProviderTransport

async def main():
    transport = ProviderTransport()
    provider = SamehadakuProvider(transport)
    results = await provider.search("Dr. STONE")
    for r in results:
        print(f"{r['title']} - {r['url']}")

asyncio.run(main())
