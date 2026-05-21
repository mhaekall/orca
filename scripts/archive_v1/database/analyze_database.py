import asyncio
import asyncpg
import os
import json
from dotenv import load_dotenv

load_dotenv('apps/api/.env')

async def main():
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    
    try:
        # 1. Total anime and episodes
        total_anime = await conn.fetchval('SELECT COUNT(*) FROM anime_metadata')
        total_eps = await conn.fetchval('SELECT COUNT(*) FROM episodes')
        
        # 2. Anime with tele-proxy
        # Get distinct anilistIds that have tele-proxy in their episodes
        tele_proxy_anime_query = """
            SELECT DISTINCT "anilistId"
            FROM episodes
            WHERE "episodeUrl" LIKE '%tele-proxy%'
        """
        tele_proxy_ids_records = await conn.fetch(tele_proxy_anime_query)
        tele_proxy_ids = [r['anilistId'] for r in tele_proxy_ids_records]
        
        # 3. Find related anime
        # We need to look at the relations column in anime_metadata
        # relations is a jsonb array. Each element has an 'id' or 'anilistId'. Let's check how it's structured.
        # But first, let's get all metadata to process locally for relations
        metadata_records = await conn.fetch('SELECT "anilistId", relations FROM anime_metadata')
        
        related_ids = set()
        for record in metadata_records:
            anilist_id = record['anilistId']
            relations = record['relations']
            
            if not relations:
                continue
                
            try:
                # relations might be a string if not properly parsed by asyncpg, but asyncpg parses jsonb to python lists/dicts
                if isinstance(relations, str):
                    relations = json.loads(relations)
                    
                for rel in relations:
                    rel_id = rel.get('id') or rel.get('anilistId')
                    # If this anime has a relation to one of the tele-proxy animes, it's protected
                    if rel_id in tele_proxy_ids:
                        related_ids.add(anilist_id)
                    # Or if this anime IS a tele-proxy anime, its relations are also protected
                    if anilist_id in tele_proxy_ids and rel_id:
                        related_ids.add(rel_id)
            except Exception as e:
                pass
                
        protected_ids = set(tele_proxy_ids).union(related_ids)
        
        print("=== DATABASE ANALYSIS ===")
        print(f"Total Anime di Database: {total_anime}")
        print(f"Total Episode di Database: {total_eps}")
        print(f"Total Anime dengan 'tele-proxy': {len(tele_proxy_ids)}")
        print(f"Total Anime yang dilindungi (Tele-proxy + Relasinya): {len(protected_ids)}")
        print(f"Jumlah Anime yang bisa di-purge (Sampah/Tidak terkait): {total_anime - len(protected_ids)}")
        
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
