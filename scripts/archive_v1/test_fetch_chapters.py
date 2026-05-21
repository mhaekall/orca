import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import urllib.parse
import re

async def fetch_manga_chapters(title: str) -> list:
    chapters_data = []
    try:
        safe_title = urllib.parse.quote(title)
        async with AsyncSession(impersonate="chrome110", timeout=12.0) as s:
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
                        for ch in chapters:
                            ch_title = ch.text.strip()
                            ch_link = ch['href']
                            match = re.search(r'\d+', ch_title)
                            ch_num = match.group() if match else ch_title
                            chapters_data.append({
                                "id": f"komikindo|{urllib.parse.quote(ch_link)}",
                                "number": str(ch_num),
                                "episodeNumber": float(ch_num) if str(ch_num).replace('.','',1).isdigit() else 0,
                                "title": ch_title,
                                "url": ch_link
                            })
                        if chapters_data:
                            return chapters_data
                            
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
                        chapters = soup_det.select("#chapterlist .lchx a")
                        if not chapters:
                            chapters = soup_det.select(".bxcl ul li .lchx a")
                        for ch in chapters:
                            ch_title = ch.text.strip()
                            ch_link = ch['href']
                            match = re.search(r'\d+', ch_title)
                            ch_num = match.group() if match else ch_title
                            chapters_data.append({
                                "id": f"bacakomik|{urllib.parse.quote(ch_link)}",
                                "number": str(ch_num),
                                "episodeNumber": float(ch_num) if str(ch_num).replace('.','',1).isdigit() else 0,
                                "title": ch_title,
                                "url": ch_link
                            })
                        if chapters_data:
                            return chapters_data
    except Exception as e:
        print(f"[Manga Chapter Fetch Error] {title}: {e}")
        
    return chapters_data

async def main():
    chapters = await fetch_manga_chapters("The Regressed Mercenary")
    print(f"Found {len(chapters)} chapters")
    if chapters:
        print(chapters[0])

asyncio.run(main())