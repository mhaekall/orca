import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import urllib.parse
import difflib

async def main():
    title = "One Piece"
    safe_title = urllib.parse.quote(title)
    async with AsyncSession(impersonate="chrome110", timeout=10.0) as s:
        res1 = await s.get(f"https://komikindo.ch/?s={safe_title}")
        soup1 = BeautifulSoup(res1.text, "html.parser")
        posts = soup1.select(".animepost")
        for i, p in enumerate(posts):
            title_el = p.select_one(".tt h3, .tt h4")
            post_title = title_el.text.strip() if title_el else "Unknown"
            link = p.select_one("a")['href']
            score = difflib.SequenceMatcher(None, title.lower(), post_title.lower()).ratio()
            print(f"[{i}] {post_title} (Score: {score:.2f}) -> {link}")

asyncio.run(main())
