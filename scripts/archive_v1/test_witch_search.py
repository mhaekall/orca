import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import urllib.parse

async def main():
    titles = ["Tongari Boushi no Atelier", "Witch Hat Atelier", "Atelier of Witch Hat"]
    async with AsyncSession(impersonate="chrome110", timeout=10.0) as s:
        for t in titles:
            safe_title = urllib.parse.quote(t)
            res1 = await s.get(f"https://komikindo.ch/?s={safe_title}")
            soup1 = BeautifulSoup(res1.text, "html.parser")
            print(f"Komikindo '{t}': {len(soup1.select('.animepost'))}")
            
            res2 = await s.get(f"https://bacakomik.my/?s={safe_title}")
            soup2 = BeautifulSoup(res2.text, "html.parser")
            print(f"Bacakomik '{t}': {len(soup2.select('.animepost'))}")

asyncio.run(main())