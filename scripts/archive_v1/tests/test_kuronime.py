import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "apps", "api")))
from services.scraper.providers.kuronime.provider import KuronimeProvider
from services.transport import ProviderTransport

async def main():
    transport = ProviderTransport()
    provider = KuronimeProvider(transport)
    sources = await provider.get_episode_sources("https://kuronime.sbs/nonton-dr-stone-episode-1/")
    print(sources)

asyncio.run(main())
