import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "apps", "api")))
from services.scraper.providers.otakudesu.provider import OtakudesuProvider
from services.transport import ProviderTransport

async def main():
    transport = ProviderTransport()
    provider = OtakudesuProvider(transport)
    sources = await provider.get_episode_sources("https://otakudesu.blog/episode/drtsn-episode-1-sub-indo/")
    print(sources)

asyncio.run(main())