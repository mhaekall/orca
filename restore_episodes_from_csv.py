import asyncio
import asyncpg
import csv
import os
from dotenv import load_dotenv

load_dotenv('apps/api/.env')

async def process_csv(conn, filename):
    print(f"Memproses file {filename}...")
    if not os.path.exists(filename):
        print(f"File {filename} tidak ditemukan.")
        return 0
        
    inserted_count = 0
    with open(filename, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        # Determine column names based on file
        id_col = 'anilistId'
        ep_num_col = 'episodeNumber'
        url_col = 'episodeUrl'
        prov_col = 'providerId'
        
        for row in reader:
            try:
                anilist_id = int(row.get(id_col, 0))
                if not anilist_id:
                    continue
                    
                ep_num = float(row.get(ep_num_col, 0))
                url = row.get(url_col, '')
                provider = row.get(prov_col, 'samehadaku')
                
                if not url:
                    continue
                    
                # Cek apakah anime ada di anime_metadata
                exists_in_meta = await conn.fetchval('SELECT "anilistId" FROM anime_metadata WHERE "anilistId" = $1', anilist_id)
                if not exists_in_meta:
                    continue
                
                # Check if episode already exists
                exists_ep = await conn.fetchval('''
                    SELECT id FROM episodes 
                    WHERE "anilistId" = $1 AND "episodeNumber" = $2 AND "providerId" = $3
                ''', anilist_id, ep_num, provider)
                
                if not exists_ep:
                    await conn.execute('''
                        INSERT INTO episodes ("anilistId", "episodeNumber", "providerId", "episodeUrl", "updatedAt")
                        VALUES ($1, $2, $3, $4, NOW())
                    ''', anilist_id, ep_num, provider, url)
                    inserted_count += 1
            except Exception as e:
                # ignore parse errors
                pass
                
    print(f"✅ Berhasil memulihkan {inserted_count} episode dari {filename}.")
    return inserted_count

async def main():
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    try:
        print("Mulai memulihkan episode yang hilang dari backup CSV...")
        count1 = await process_csv(conn, 'merged_swarm_backup.csv')
        count2 = await process_csv(conn, 'db_swarm_vault.csv')
        
        total = count1 + count2
        print(f"\\n🎉 Total {total} episode berhasil di-ingest kembali ke database!")
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
