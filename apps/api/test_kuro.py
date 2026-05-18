import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath('.'))
from services.scraper.providers.kuronime.provider import KuronimeProvider
from services.transport import ProviderTransport

async def main():
    transport = ProviderTransport()
    provider = KuronimeProvider(transport)
    
    url = "https://kuronime.sbs/nonton-youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e-season-3-episode-10/"
    sources = await provider.get_episode_sources(url)
    
    for s in sources:
        print(s)

if __name__ == "__main__":
    asyncio.run(main())
