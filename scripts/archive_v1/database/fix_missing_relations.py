import asyncio
import asyncpg
import os
import json
import urllib.request
import time
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
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))['data']['Media']
    except Exception as e:
        print(f"Error fetching {media_id}: {e}")
        return None

async def process_media(conn, media_id, db_ids):
    if media_id in db_ids:
        # Just update relations if it exists
        media = fetch_anilist(media_id)
        if media and media['relations'] and media['relations']['edges']:
            relations = []
            for edge in media['relations']['edges']:
                if edge['node']['type'] == 'ANIME':
                    relations.append({
                        'id': edge['node']['id'],
                        'relationType': edge['relationType'],
                        'title': edge['node']['title']['romaji']
                    })
            await conn.execute('UPDATE anime_metadata SET relations = $1 WHERE "anilistId" = $2', json.dumps(relations), media_id)
            return relations
        return []
    
    # Needs insertion
    print(f"Fetching missing media ID: {media_id}...")
    media = fetch_anilist(media_id)
    time.sleep(1) # ratelimit
    if not media:
        return []
        
    title = media['title']
    clean_title = title.get('english') or title.get('romaji')
    native_title = title.get('native') or title.get('romaji')
    cover = media['coverImage']['extraLarge'] or media['coverImage']['large']
    
    studios = [edge['node']['name'] for edge in media['studios']['edges']] if media.get('studios') and media['studios'].get('edges') else []
    
    relations = []
    if media['relations'] and media['relations']['edges']:
        for edge in media['relations']['edges']:
            if edge['node']['type'] == 'ANIME':
                relations.append({
                    'id': edge['node']['id'],
                    'relationType': edge['relationType'],
                    'title': edge['node']['title']['romaji']
                })
                
    try:
        await conn.execute('''
            INSERT INTO anime_metadata (
                "anilistId", "cleanTitle", "nativeTitle", "coverImage", "bannerImage", 
                synopsis, score, status, "totalEpisodes", season, year, 
                studios, genres, relations, popularity, trending, "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
            ON CONFLICT ("anilistId") DO UPDATE SET relations = $14
        ''', 
        media['id'], clean_title, native_title, cover, media['bannerImage'],
        media['description'], media['averageScore'], media['status'], media['episodes'],
        media['season'], media['seasonYear'], json.dumps(studios), json.dumps(media['genres']),
        json.dumps(relations), media['popularity'], media['trending']
        )
        print(f"✅ Ingested missing season: {clean_title}")
        db_ids.add(media_id)
        return relations
    except Exception as e:
        print(f"Failed to insert DB for {media_id}: {e}")
        return []

async def main():
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    
    try:
        print("1. Mengambil semua ID yang ada di DB sekarang...")
        db_records = await conn.fetch('SELECT "anilistId" FROM anime_metadata')
        db_ids = {r['anilistId'] for r in db_records}
        
        queue = list(db_ids)
        processed = set()
        
        print(f"Memulai perbaikan relasi untuk {len(queue)} anime...")
        
        while queue:
            current_id = queue.pop(0)
            if current_id in processed:
                continue
            
            processed.add(current_id)
            relations = await process_media(conn, current_id, db_ids)
            
            for rel in relations:
                rel_type = rel.get('relationType')
                # Hanya tarik franchise utama (prekuel, sekuel, cerita sampingan)
                if rel_type in ['PREQUEL', 'SEQUEL', 'ALTERNATIVE', 'SIDE_STORY', 'SPIN_OFF']:
                    rel_id = rel.get('id')
                    if rel_id and rel_id not in processed and rel_id not in queue:
                        queue.append(rel_id)
                        
        print("\\n✅ Seluruh Franchise (Season 1, 2, 3, Movie) berhasil direstorasi dan dirangkai kembali!")
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
