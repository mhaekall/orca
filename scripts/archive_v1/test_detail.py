import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import urllib.parse

async def main():
    async with AsyncSession(impersonate="chrome110", timeout=8.0) as s:
        # Search first
        res1 = await s.get(f"https://komikindo.ch/?s=Absolute+Regression")
        soup1 = BeautifulSoup(res1.text, "html.parser")
        post = soup1.select_one(".animepost a")
        if not post: return
        link = post['href']
        print("Detail link:", link)
        
        # Get Detail
        res2 = await s.get(link)
        soup2 = BeautifulSoup(res2.text, "html.parser")
        chapters = soup2.select("#chapter_list .lchx a")
        print("Chapters found:", len(chapters))

asyncio.run(main())
