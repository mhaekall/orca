import asyncio
import asyncpg
import os
import json
from dotenv import load_dotenv

load_dotenv('apps/api/.env')

async def main():
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    
    try:
        # 1. Dapatkan anime yang memiliki stream tele-proxy
        tele_proxy_anime_query = """
            SELECT DISTINCT "anilistId"
            FROM episodes
            WHERE "episodeUrl" LIKE '%tele-proxy%'
        """
        tele_proxy_ids_records = await conn.fetch(tele_proxy_anime_query)
        tele_proxy_ids = [r['anilistId'] for r in tele_proxy_ids_records]
        
        # 2. Ambil semua metadata untuk mengecek relasi dan genre
        metadata_records = await conn.fetch('SELECT "anilistId", relations, genres FROM anime_metadata')
        
        protected_ids = set(tele_proxy_ids)
        
        for record in metadata_records:
            anilist_id = record['anilistId']
            relations = record['relations']
            genres = record['genres']
            
            # Perlindungan KONDISI 1: Genre Psychological atau Isekai
            if genres:
                try:
                    if isinstance(genres, str):
                        genres = json.loads(genres)
                    if 'Psychological' in genres or 'Isekai' in genres:
                        protected_ids.add(anilist_id)
                except:
                    pass
            
            # Perlindungan KONDISI 2: Relasi ke anime tele-proxy
            if relations:
                try:
                    if isinstance(relations, str):
                        relations = json.loads(relations)
                    for rel in relations:
                        rel_id = rel.get('id') or rel.get('anilistId')
                        # Jika anime ini berhubungan dengan tele-proxy anime
                        if rel_id in tele_proxy_ids:
                            protected_ids.add(anilist_id)
                        # Jika anime ini ADALAH tele-proxy anime, lindungi relasinya
                        if anilist_id in tele_proxy_ids and rel_id:
                            protected_ids.add(rel_id)
                except:
                    pass

        protected_ids_list = list(protected_ids)
        
        if not protected_ids_list:
            print("Error: Tidak ada ID yang dilindungi. Dibatalkan untuk mencegah database kosong.")
            return

        total_anime = await conn.fetchval('SELECT COUNT(*) FROM anime_metadata')
        to_delete_anime = total_anime - len(protected_ids_list)
        
        print("=== THE GREAT PURGE ===")
        print(f"Total Anime awal: {total_anime}")
        print(f"Total Anime dilindungi (Tele-proxy + Relasi + Psychological + Isekai): {len(protected_ids_list)}")
        print(f"Mengeksekusi penghapusan untuk {to_delete_anime} anime sampah...")
        
        if to_delete_anime > 0:
            # Hapus episodes terlebih dahulu untuk mencegah error Foreign Key
            deleted_eps = await conn.execute('''
                DELETE FROM episodes 
                WHERE "anilistId" != ALL($1::int[])
            ''', protected_ids_list)
            
            # Hapus anime metadata
            deleted_anime = await conn.execute('''
                DELETE FROM anime_metadata 
                WHERE "anilistId" != ALL($1::int[])
            ''', protected_ids_list)
            
            print(f"✅ Berhasil mengeksekusi: {deleted_eps} dari tabel episodes.")
            print(f"✅ Berhasil mengeksekusi: {deleted_anime} dari tabel anime_metadata.")
        else:
            print("Database sudah bersih. Tidak ada yang perlu dihapus.")

    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
