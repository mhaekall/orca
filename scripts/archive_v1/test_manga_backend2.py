import asyncio
from apps.api.services.anilist import client, GET_MANGA_BY_ID

async def main():
    response = await client.post("https://graphql.anilist.co", json={"query": GET_MANGA_BY_ID, "variables": {"id": 132029}})
    print(response.json())

asyncio.run(main())
