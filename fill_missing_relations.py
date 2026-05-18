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
    relations {
      edges {
        relationType
        node { id title { romaji } type format status }
      }
    }
  }
}
'''

def fetch_relations_from_anilist(media_id):
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

async def main():
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    
    try:
        print("Mengecek seluruh anime di database untuk memperbaiki relations yang kosong...")
        # Ambil semua anime yang ada di database
        db_records = await conn.fetch('SELECT "anilistId", "cleanTitle", relations FROM anime_metadata')
        
        updated_count = 0
        
        for row in db_records:
            anilist_id = row['anilistId']
            title = row['cleanTitle']
            current_relations = row['relations']
            
            # Jika relations kosong (None) atau array kosong ("[]")
            if not current_relations or current_relations == "[]":
                print(f"Memperbarui relations untuk: {title} (ID: {anilist_id})")
                
                # Fetch dari AniList
                media = fetch_relations_from_anilist(anilist_id)
                time.sleep(1.5) # Hindari Rate Limit 429
                
                if media and media.get('relations') and media['relations'].get('edges'):
                    relations = []
                    for edge in media['relations']['edges']:
                        if edge['node']['type'] == 'ANIME':
                            relations.append({
                                'id': edge['node']['id'],
                                'relationType': edge['relationType'],
                                'title': edge['node']['title']['romaji']
                            })
                    
                    # Update ke database
                    await conn.execute('UPDATE anime_metadata SET relations = $1 WHERE "anilistId" = $2', json.dumps(relations), anilist_id)
                    print(f"  -> Tersimpan {len(relations)} relasi.")
                    updated_count += 1
                else:
                    print(f"  -> Tidak ada relasi yang ditemukan di AniList.")
                    # Update dengan array kosong agar tidak None
                    await conn.execute('UPDATE anime_metadata SET relations = $1 WHERE "anilistId" = $2', "[]", anilist_id)
                    
        print(f"\\n✅ Selesai. Total {updated_count} anime berhasil diperbarui relasinya.")
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
