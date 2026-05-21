import asyncio
import httpx
from bs4 import BeautifulSoup

async def check_komikindo(title: str):
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            res = await client.get(f"https://komikindo.ch/?s={title}")
            soup = BeautifulSoup(res.text, "html.parser")
            posts = soup.select(".animepost")
            return len(posts) > 0
        except Exception as e:
            return False

async def main():
    titles = ["One Piece", "Jujutsu Kaisen", "Unknown Manga 12345"]
    tasks = [check_komikindo(t) for t in titles]
    results = await asyncio.gather(*tasks)
    for t, r in zip(titles, results):
        print(f"{t}: {r}")

asyncio.run(main())
