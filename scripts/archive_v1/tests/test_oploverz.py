import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "apps", "api")))
from services.scraper.providers.oploverz.provider import OploverzProvider
from services.transport import ProviderTransport

async def main():
    transport = ProviderTransport()
    provider = OploverzProvider(transport)
    results = await provider.search("Dr. STONE")
    for r in results:
        print(f"{r['title']} - {r['url']}")

asyncio.run(main())
