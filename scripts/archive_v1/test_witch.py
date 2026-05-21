import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import urllib.parse
import difflib

async def main():
    title = "Witch Hat Atelier"
    safe_title = urllib.parse.quote(title)
    print(f"Searching for: {title}")
    async with AsyncSession(impersonate="chrome110", timeout=10.0) as s:
        res1 = await s.get(f"https://komikindo.ch/?s={safe_title}")
        soup1 = BeautifulSoup(res1.text, "html.parser")
        posts = soup1.select(".animepost")
        print(f"Komikindo search results: {len(posts)}")
        for p in posts:
            t = p.select_one(".tt").text.strip()
            print(" -", t)
            
        res2 = await s.get(f"https://bacakomik.my/?s={safe_title}")
        soup2 = BeautifulSoup(res2.text, "html.parser")
        posts2 = soup2.select(".animepost")
        print(f"Bacakomik search results: {len(posts2)}")
        for p in posts2:
            t = p.select_one(".tt").text.strip()
            print(" -", t)

asyncio.run(main())
