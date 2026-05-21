import asyncio
import aiohttp

async def main():
    query = '''
    query ($search: String) {
      Media (search: $search, type: ANIME) {
        id
        title {
          romaji
          english
        }
        season
        seasonYear
      }
    }
    '''
    variables = {
        'search': 'Dr. Stone'
    }
    async with aiohttp.ClientSession() as session:
        async with session.post('https://graphql.anilist.co', json={'query': query, 'variables': variables}) as resp:
            data = await resp.json()
            print(data)

asyncio.run(main())