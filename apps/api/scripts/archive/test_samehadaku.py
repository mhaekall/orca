import asyncio
import os
import sys
import json

sys.path.insert(0, os.path.abspath('.'))
from services.scraper.providers.samehadaku.provider import SamehadakuProvider
from services.transport import ProviderTransport

async def main():
    t = ProviderTransport()
    p = SamehadakuProvider(t)
    res = await p.get_episode_sources('https://v2.samehadaku.how/classroom-of-the-elite-season-4-episode-1/')
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
