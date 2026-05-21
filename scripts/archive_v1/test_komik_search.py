import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import urllib.parse

async def main():
    titles = ["The Regressed Mercenary", "Absolute Regression", "The Regressed Mercenary Has a Plan"]
    async with AsyncSession(impersonate="chrome110", timeout=10.0) as s:
        for t in titles:
            safe_title = urllib.parse.quote(t)
            res = await s.get(f"https://komikindo.ch/?s={safe_title}")
            soup = BeautifulSoup(res.text, "html.parser")
            posts = soup.select(".animepost")
            print(f"'{t}' -> {len(posts)} results")

asyncio.run(main())
