import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import urllib.parse

async def main():
    title = "Absolute Regression"
    safe_title = urllib.parse.quote(title)
    print("Searching for:", title)
    async with AsyncSession(impersonate="chrome110", timeout=10.0) as s:
        # 1. Cek Komikindo
        res1 = await s.get(f"https://komikindo.ch/?s={safe_title}")
        soup1 = BeautifulSoup(res1.text, "html.parser")
        posts = soup1.select(".animepost")
        print(f"Komikindo search results: {len(posts)}")
        
        # 2. Cek Bacakomik
        res2 = await s.get(f"https://bacakomik.my/?s={safe_title}")
        soup2 = BeautifulSoup(res2.text, "html.parser")
        posts2 = soup2.select(".animepost")
        print(f"Bacakomik search results: {len(posts2)}")

asyncio.run(main())
