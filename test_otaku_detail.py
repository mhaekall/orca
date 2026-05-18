import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "apps", "api")))
from services.scraper.providers.otakudesu.provider import OtakudesuProvider
from services.transport import ProviderTransport

async def main():
    transport = ProviderTransport()
    provider = OtakudesuProvider(transport)
    detail = await provider.get_anime_detail("https://otakudesu.blog/anime/drstne-sub-indo/")
    for ep in detail['episodes']:
        print(f"Ep {ep['number']}: {ep['url']}")

asyncio.run(main())
