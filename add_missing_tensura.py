import asyncio
import asyncpg
import os
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv('apps/api/.env')

ANILIST_URL = 'https://graphql.anilist.co'

QUERY = '''
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english native }
    coverImage { extraLarge large color }
    bannerImage
    description
    averageScore
    status
    episodes
    season
    seasonYear
    studios { edges { isMain node { name } } }
    genres
    popularity
    trending
    relations {
      edges {
        relationType
        node { id title { romaji } type format status }
      }
    }
  }
}
'''

def fetch_anilist(media_id):
    req = urllib.request.Request(
        ANILIST_URL,
        data=json.dumps({'query': QUERY, 'variables': {'id': media_id}}).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))['data']['Media']

async def main():
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    for media_id in [161802, 101280]: # Coleus and Tensura S1
        try:
            media = fetch_anilist(media_id)
            if not media: continue
            title = media['title']
            clean_title = title.get('english') or title.get('romaji')
            native_title = title.get('native') or title.get('romaji')
            cover = media['coverImage']['extraLarge'] or media['coverImage']['large']
            studios = [edge['node']['name'] for edge in media['studios']['edges']] if media.get('studios') and media['studios'].get('edges') else []
            relations = []
            if media['relations'] and media['relations']['edges']:
                for edge in media['relations']['edges']:
                    if edge['node']['type'] == 'ANIME':
                        relations.append({'id': edge['node']['id'], 'relationType': edge['relationType'], 'title': edge['node']['title']['romaji']})
            await conn.execute('''
                INSERT INTO anime_metadata (
                    "anilistId", "cleanTitle", "nativeTitle", "coverImage", "bannerImage", 
                    synopsis, score, status, "totalEpisodes", season, year, 
                    studios, genres, relations, popularity, trending, "updatedAt"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
                ON CONFLICT ("anilistId") DO UPDATE SET relations = $14
            ''', media['id'], clean_title, native_title, cover, media['bannerImage'], media['description'], media['averageScore'], media['status'], media['episodes'], media['season'], media['seasonYear'], json.dumps(studios), json.dumps(media['genres']), json.dumps(relations), media['popularity'], media['trending'])
            print(f'Inserted {clean_title} (ID: {media_id})')
        except Exception as e:
            print(f"Error {media_id}: {e}")
    await conn.close()
    
if __name__ == "__main__":
    asyncio.run(main())
