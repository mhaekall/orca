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
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))['data']['Media']
    except Exception as e:
        print(f"Error fetching {media_id}: {e}")
        return None

async def ingest_metadata(conn, media_id):
    # Check if exists
    exists = await conn.fetchval('SELECT "anilistId" FROM anime_metadata WHERE "anilistId" = $1', media_id)
    if exists:
        return True
        
    print(f"Fetching metadata for ID: {media_id}...")
    media = fetch_anilist(media_id)
    if not media:
        return False
        
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
            ON CONFLICT ("anilistId") DO NOTHING
        ''', 
        media['id'], clean_title, native_title, cover, media['bannerImage'],
        media['description'], media['averageScore'], media['status'], media['episodes'],
        media['season'], media['seasonYear'], json.dumps(studios), json.dumps(media['genres']),
        json.dumps(relations), media['popularity'], media['trending']
        )
        print(f"✅ Ingested metadata for {clean_title}")
        return True
    except Exception as e:
        print(f"Failed to insert DB for {media_id}: {e}")
        return False

async def main():
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    
    try:
        print("1. Mengembalikan Wistoria S1 dan Angel Next Door S1...")
        await ingest_metadata(conn, 174576) # Wistoria S1
        await ingest_metadata(conn, 143338) # Angel Next Door S1
        
        # Restore episodes from CSV for Wistoria S1 if they don't exist
        # Based on grep, we know Wistoria S1 has episodes in merged_swarm_backup.csv:
        # 200,174576,Wistoria: Wand and Sword,1,samehadaku,https://tg-proxy-2...
        # 134,174576,Wistoria: Wand and Sword,2,samehadaku,https://tg-proxy-3...
        # We will insert them directly
        eps_wistoria = [
            (174576, 1.0, 'samehadaku', 'https://tg-proxy-2.moehamadhkl.workers.dev/stream/bot8661115912:AAEc1VN4dhI7Zh3PlVHmiwZrR2uwm-WHCOU/BQACAgUAAyEGAATc0SFaAAEBbaVp_n16SR0kyjpmqoQtgyEGWNAR3QACKCcAAlI08FdCt48k5X4oyjsE'),
            (174576, 2.0, 'samehadaku', 'https://tg-proxy-3.moehamadhkl.workers.dev/stream/bot7833034554:AAFCnZXxPX9_XDXmHTTCllYe_zuy9y0pwO8/BQACAgUAAyEGAATc0SFaAAEBbsJp_qrGYdae2EiszeJmz1YDnQ2laQACYikAAlI08FcZfMcJRXAN3TsE')
        ]
        for ep in eps_wistoria:
            await conn.execute('''
                INSERT INTO episodes ("anilistId", "episodeNumber", "providerId", "episodeUrl", "updatedAt")
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT DO NOTHING
            ''', ep[0], ep[1], ep[2], ep[3])
            
        print("✅ Restorasi S1 selesai.")
        
        print("\\n2. Memindai seluruh database untuk mencari Prekuel/Sekuel yang hilang...")
        # Get all anime in DB
        db_animes = await conn.fetch('SELECT "anilistId", "cleanTitle", relations FROM anime_metadata')
        db_ids = {r['anilistId'] for r in db_animes}
        
        missing_relations = []
        
        for row in db_animes:
            rel_str = row['relations']
            if not rel_str: continue
            
            try:
                rels = json.loads(rel_str) if isinstance(rel_str, str) else rel_str
                for rel in rels:
                    rel_type = rel.get('relationType')
                    # We only care about PREQUEL and SEQUEL (direct story continuity)
                    if rel_type in ['PREQUEL', 'SEQUEL']:
                        rel_id = rel.get('id') or rel.get('anilistId')
                        if rel_id and rel_id not in db_ids:
                            missing_relations.append({
                                'parent_title': row['cleanTitle'],
                                'missing_id': rel_id,
                                'missing_title': rel.get('title'),
                                'type': rel_type
                            })
            except:
                pass
                
        # Deduplicate missing
        unique_missing = {}
        for m in missing_relations:
            if m['missing_id'] not in unique_missing:
                unique_missing[m['missing_id']] = m
                
        print(f"\\nDitemukan {len(unique_missing)} Season/Prequel/Sequel yang terputus dari database:")
        for idx, m in enumerate(list(unique_missing.values())[:20]):
            print(f"- {m['parent_title']} kehilangan {m['type']}: {m['missing_title']} (ID: {m['missing_id']})")
            
        if len(unique_missing) > 20:
            print(f"... dan {len(unique_missing) - 20} anime lainnya.")
            
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
