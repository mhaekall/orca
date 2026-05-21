import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import urllib.parse

async def main():
    safe_title = urllib.parse.quote("One Piece")
    async with AsyncSession(impersonate="chrome110", timeout=8.0) as s:
        res1 = await s.get(f"https://bacakomik.my/?s={safe_title}")
        soup1 = BeautifulSoup(res1.text, "html.parser")
        posts = soup1.select(".animepost")
        if posts:
            print("Bacakomik Post found!")
            print(posts[0].prettify())
        else:
            print("No posts found.")

asyncio.run(main())
