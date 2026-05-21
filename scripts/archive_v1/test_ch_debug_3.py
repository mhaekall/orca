import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import urllib.parse

async def main():
    safe_title = urllib.parse.quote("Absolute Regression")
    async with AsyncSession(impersonate="chrome110", timeout=8.0) as s:
        res1 = await s.get(f"https://komikindo.ch/?s={safe_title}")
        soup1 = BeautifulSoup(res1.text, "html.parser")
        posts = soup1.select(".animepost")
        if posts:
            print("Komikindo Post found!")
        else:
            print("Komikindo No posts found.")
            
        res2 = await s.get(f"https://bacakomik.my/?s={safe_title}")
        soup2 = BeautifulSoup(res2.text, "html.parser")
        posts2 = soup2.select(".animepost")
        if posts2:
            print("Bacakomik Post found!")
        else:
            print("Bacakomik No posts found.")

asyncio.run(main())
