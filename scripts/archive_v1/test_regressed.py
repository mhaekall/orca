import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import urllib.parse
import re

async def main():
    title = "The Regressed Mercenary"
    safe_title = urllib.parse.quote(title)
    print("Searching for:", title)
    async with AsyncSession(impersonate="chrome110", timeout=10.0) as s:
        # 1. Cek Komikindo
        res1 = await s.get(f"https://komikindo.ch/?s={safe_title}")
        soup1 = BeautifulSoup(res1.text, "html.parser")
        posts = soup1.select(".animepost")
        print(f"Komikindo search results: {len(posts)}")
        if posts:
            link_el = posts[0].select_one("a")
            detail_url = link_el['href']
            print(f"Komikindo detail URL: {detail_url}")
            res_det = await s.get(detail_url)
            soup_det = BeautifulSoup(res_det.text, "html.parser")
            chapters = soup_det.select("#chapter_list .lchx a")
            if chapters:
                match = re.search(r'\d+', chapters[0].text)
                print(f"Komikindo latest chapter: {match.group() if match else 'None'}")
                
        # 2. Cek Bacakomik
        res2 = await s.get(f"https://bacakomik.my/?s={safe_title}")
        soup2 = BeautifulSoup(res2.text, "html.parser")
        posts2 = soup2.select(".animepost")
        print(f"Bacakomik search results: {len(posts2)}")
        if posts2:
            link_el = posts2[0].select_one("a")
            detail_url = link_el['href']
            print(f"Bacakomik detail URL: {detail_url}")
            res_det = await s.get(detail_url)
            soup_det = BeautifulSoup(res_det.text, "html.parser")
            chapters = soup_det.select("#chapterlist .lchx a")
            if not chapters:
                chapters = soup_det.select(".bxcl ul li .lchx a")
            if chapters:
                match = re.search(r'\d+', chapters[0].text)
                print(f"Bacakomik latest chapter: {match.group() if match else 'None'}")

asyncio.run(main())
