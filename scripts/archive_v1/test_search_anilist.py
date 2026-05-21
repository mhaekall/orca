import asyncio
from services.clients import client

GET_MANGA_SEARCH = """
  query ($search: String, $page: Int, $perPage: Int, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      media(search: $search, type: MANGA, sort: $sort, isAdult: false) {
        id
        title { romaji english native }
      }
    }
  }
"""

async def main():
    variables = {"search": "The Regressed Mercenary", "page": 1, "perPage": 5, "sort": ["POPULARITY_DESC"]}
    response = await client.post("https://graphql.anilist.co", json={"query": GET_MANGA_SEARCH, "variables": variables})
    data = response.json().get("data", {}).get("Page", {})
    media_list = data.get("media", [])
    for m in media_list:
        print("Anilist ID:", m["id"])
        print("Title:", m["title"])

asyncio.run(main())