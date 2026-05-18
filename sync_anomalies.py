import asyncio
import asyncpg
import os
import sys
import json
import urllib.request
import time
from dotenv import load_dotenv

load_dotenv('apps/api/.env')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'apps', 'api'))

from apps.api.db.connection import database
from apps.api.services.db import upsert_mapping_atomic
from apps.api.services.pipeline import PROVIDERS, sync_anime_episodes

ANILIST_URL = 'https://graphql.anilist.co'

QUERY = '''
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    status
    format
  }
}
'''

def fetch_anilist_status_format(media_id):
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
    await database.connect()
    try:
        # 1. Add format column if it doesn't exist
        await conn.execute('ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS format VARCHAR(50)')
        
        # 2. Get all animes with 0 eps
        rows = await conn.fetch('''
            SELECT m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage"
            FROM anime_metadata m
            LEFT JOIN episodes e ON m."anilistId" = e."anilistId"
            GROUP BY m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage"
            HAVING COUNT(e.id) = 0
        ''')
        
        print(f"Found {len(rows)} anime with 0 episodes to process.")
        
        for row in rows:
            aid = row['anilistId']
            title = row['cleanTitle']
            native_title = row['nativeTitle']
            cover = row['coverImage']
            
            print(f"\\nProcessing: {title} (ID: {aid})")
            
            # Update status and format from Anilist
            media = fetch_anilist_status_format(aid)
            time.sleep(1) # rate limit
            if media:
                status = media.get('status')
                format_ = media.get('format')
                await conn.execute('UPDATE anime_metadata SET status = $1, format = $2 WHERE "anilistId" = $3', status, format_, aid)
                print(f"  -> Updated status: {status}, format: {format_}")
            
            # If it's NOT_YET_RELEASED, skip searching episodes
            if media and media.get('status') == 'NOT_YET_RELEASED':
                print("  -> Belum tayang, skip pencarian episode.")
                continue
                
            # If it's released, try to search providers using nativeTitle
            print(f"  -> Mencari episode menggunakan b native: {native_title}")
            
            found_mapping = False
            for prov_id, provider in PROVIDERS.items():
                if not hasattr(provider, "search"):
                    continue
                try:
                    async with asyncio.timeout(10.0):
                        search_results = await provider.search(native_title)
                    
                    if search_results:
                        best_match = search_results[0]
                        url = best_match["url"].strip("/")
                        slug = url.split("/")[-1]

                        if slug:
                            print(f"     ✅ Found match on {prov_id} using native title: {slug}")
                            await upsert_mapping_atomic(
                                anilist_id=aid,
                                provider_id=prov_id,
                                provider_slug=slug,
                                clean_title=title,
                                cover_image=cover,
                            )
                            found_mapping = True
                            break
                except Exception as e:
                    print(f"     ❌ Search error on {prov_id}: {e}")
                    
            if not found_mapping:
                # Fallback to English title if native fails
                print(f"  -> Fallback mencari menggunakan cleanTitle: {title}")
                for prov_id, provider in PROVIDERS.items():
                    if not hasattr(provider, "search"):
                        continue
                    try:
                        async with asyncio.timeout(10.0):
                            search_results = await provider.search(title)
                        
                        if search_results:
                            best_match = search_results[0]
                            url = best_match["url"].strip("/")
                            slug = url.split("/")[-1]

                            if slug:
                                print(f"     ✅ Found match on {prov_id} using clean title: {slug}")
                                await upsert_mapping_atomic(
                                    anilist_id=aid,
                                    provider_id=prov_id,
                                    provider_slug=slug,
                                    clean_title=title,
                                    cover_image=cover,
                                )
                                found_mapping = True
                                break
                    except Exception as e:
                        pass
                        
            if found_mapping:
                print("  -> Triggering episode sync...")
                await sync_anime_episodes(aid)
                
    finally:
        await database.disconnect()
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
