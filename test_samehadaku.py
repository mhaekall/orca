import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "apps", "api")))
from services.scraper.providers.samehadaku.provider import SamehadakuProvider
from services.transport import ProviderTransport

async def main():
    transport = ProviderTransport()
    provider = SamehadakuProvider(transport)
    sources = await provider.get_episode_sources("https://v2.samehadaku.how/dr-stone-episode-24/")
    print(sources)

asyncio.run(main())
