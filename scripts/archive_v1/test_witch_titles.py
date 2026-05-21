import asyncio
import httpx

async def main():
    query = """
    query {
      Media(id: 98263, type: MANGA) {
        id title { romaji english native } synonyms
      }
    }
    """
    async with httpx.AsyncClient() as client:
        res = await client.post("https://graphql.anilist.co", json={"query": query})
        print(res.json())

asyncio.run(main())