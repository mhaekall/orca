import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath('.'))
from services.scraper.providers.kuronime.provider import KuronimeProvider
from services.transport import ProviderTransport

async def main():
    transport = ProviderTransport()
    provider = KuronimeProvider(transport)
    
    print("Searching Kuronime for Classroom of the Elite...")
    results = await provider.search("Classroom of the Elite")
    for r in results:
        print(r)

if __name__ == "__main__":
    asyncio.run(main())
