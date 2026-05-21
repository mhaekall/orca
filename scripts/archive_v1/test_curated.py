import asyncio
import httpx

CURATED_MANGA_IDS = [
    # Manhwa Masterpieces
    105398, 119257, 111243, 85933, 85934, 100231, 100230, 105951, 115255, 132216,
    127926, 129759, 111624, 125026, 127437, 114637, 105393, 115624, 109864,
    
    # Manga Masterpieces
    30013, 30002, 30656, 30001, 30025, 30736, 3642, 46649, 30003, 74347, 63397,
    101517, 87216, 85135, 102988, 108556, 123892, 125828, 132029, 132218, 137837,
    30012, 30011, 113138, 100128, 105399
]

GET_MANGA_INFO = """
query ($ids: [Int]) {
  Page(page: 1, perPage: 50) {
    media(id_in: $ids, type: MANGA) {
      id title { english romaji } averageScore
    }
  }
}
"""

async def main():
    async with httpx.AsyncClient() as client:
        res = await client.post("https://graphql.anilist.co", json={"query": GET_MANGA_INFO, "variables": {"ids": CURATED_MANGA_IDS}})
        data = res.json()
        media = data.get("data", {}).get("Page", {}).get("media", [])
        sorted_media = sorted(media, key=lambda x: x.get("averageScore") or 0)
        for m in sorted_media:
            title = m["title"].get("english") or m["title"].get("romaji")
            print(f"[{m['id']}] Score: {m['averageScore']} | {title}")

asyncio.run(main())
