import asyncio
import httpx

GET_TOP_MANGA = """
query {
  Page(page: 1, perPage: 50) {
    media(type: MANGA, sort: SCORE_DESC, isAdult: false, format: MANGA) {
      id title { english romaji } averageScore popularity
    }
  }
}
"""

async def main():
    async with httpx.AsyncClient() as client:
        res = await client.post("https://graphql.anilist.co", json={"query": GET_TOP_MANGA})
        media = res.json()["data"]["Page"]["media"]
        print("Manga IDs:")
        ids = []
        for m in media:
            if m["popularity"] > 10000: # Filter out obscure ones
                ids.append(m["id"])
                print(f"    {m['id']}, # {m['title'].get('english') or m['title'].get('romaji')} (Score: {m['averageScore']})")
        print(f"Found {len(ids)} top manga")

        # Also get top Manhwa
        GET_TOP_MANHWA = """
        query {
          Page(page: 1, perPage: 25) {
            media(type: MANGA, sort: SCORE_DESC, isAdult: false, countryOfOrigin: "KR") {
              id title { english romaji } averageScore popularity
            }
          }
        }
        """
        res2 = await client.post("https://graphql.anilist.co", json={"query": GET_TOP_MANHWA})
        media2 = res2.json()["data"]["Page"]["media"]
        print("\nManhwa IDs:")
        for m in media2:
            if m["popularity"] > 10000:
                ids.append(m["id"])
                print(f"    {m['id']}, # {m['title'].get('english') or m['title'].get('romaji')} (Score: {m['averageScore']})")
        
        print(f"\nTotal curated: {len(ids)}")
        print(ids)

asyncio.run(main())
