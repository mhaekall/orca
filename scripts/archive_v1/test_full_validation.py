import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import urllib.parse
import re

async def check_manga_availability(title: str, sem: asyncio.Semaphore) -> tuple[bool, int]:
    async with sem:
        try:
            safe_title = urllib.parse.quote(title)
            async with AsyncSession(impersonate="chrome110", timeout=10.0) as s:
                # 1. Cek Komikindo
                res1 = await s.get(f"https://komikindo.ch/?s={safe_title}")
                if res1.status_code not in [403, 503]:
                    soup1 = BeautifulSoup(res1.text, "html.parser")
                    posts = soup1.select(".animepost")
                    if posts:
                        link_el = posts[0].select_one("a")
                        if link_el and 'href' in link_el.attrs:
                            detail_url = link_el['href']
                            res_det = await s.get(detail_url)
                            soup_det = BeautifulSoup(res_det.text, "html.parser")
                            chapters = soup_det.select("#chapter_list .lchx a")
                            if chapters:
                                match = re.search(r'\d+', chapters[0].text)
                                if match: return True, int(match.group())
                        return True, 0
                
                # 2. Cek Bacakomik
                res2 = await s.get(f"https://bacakomik.my/?s={safe_title}")
                if res2.status_code not in [403, 503]:
                    soup2 = BeautifulSoup(res2.text, "html.parser")
                    posts = soup2.select(".animepost")
                    if posts:
                        link_el = posts[0].select_one("a")
                        if link_el and 'href' in link_el.attrs:
                            detail_url = link_el['href']
                            res_det = await s.get(detail_url)
                            soup_det = BeautifulSoup(res_det.text, "html.parser")
                            # Bacakomik uses #chapterlist
                            chapters = soup_det.select("#chapterlist .lchx a")
                            if not chapters:
                                chapters = soup_det.select(".bxcl ul li .lchx a")
                            if chapters:
                                match = re.search(r'\d+', chapters[0].text)
                                if match: return True, int(match.group())
                        return True, 0
                
                # Fallback jika cloudflare block
                if res1.status_code in [403, 503] and res2.status_code in [403, 503]:
                    return True, 0
                    
                return False, 0
        except Exception as e:
            return True, 0

async def main():
    sem = asyncio.Semaphore(5)
    valid, ch = await check_manga_availability("Absolute Regression", sem)
    print("Absolute Regression:", valid, ch)
    valid, ch = await check_manga_availability("One Piece", sem)
    print("One Piece:", valid, ch)

asyncio.run(main())
