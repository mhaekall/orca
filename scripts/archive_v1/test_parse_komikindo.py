import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import urllib.parse
import re

async def main():
    title = "Absolute Regression"
    safe_title = urllib.parse.quote(title)
    async with AsyncSession(impersonate="chrome110", timeout=10.0) as s:
        res1 = await s.get(f"https://komikindo.ch/?s={safe_title}")
        soup1 = BeautifulSoup(res1.text, "html.parser")
        posts = soup1.select(".animepost")
        link = posts[0].select_one("a")['href']
        
        print("Detail Link:", link)
        res_det = await s.get(link)
        soup_det = BeautifulSoup(res_det.text, "html.parser")
        chapters = soup_det.select("#chapter_list .lchx a")
        print(f"Parsed Chapters count: {len(chapters)}")
        
        # Test MangaEngine mobile logic
        # For Komikindo chapterNumber: '@text' -> text of the <a> tag
        for i, ch in enumerate(chapters[:5]):
            print(f"Chapter {i+1}: Text='{ch.text.strip()}' Link='{ch['href']}'")

asyncio.run(main())
