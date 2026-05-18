import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv('apps/api/.env')

async def main():
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    
    # 1. Temukan anime yang di-map secara keliru ke TenSura S4
    bad_mappings = await conn.fetch('''
        SELECT id, "anilistId" FROM anime_mappings 
        WHERE "providerSlug" = 'tensei-shitara-slime-datta-ken-s4' AND "anilistId" != 182205
    ''')
    
    bad_ids = [m['anilistId'] for m in bad_mappings]
    
    if bad_ids:
        print(f"Menemukan {len(bad_ids)} mapping yang salah akibat bug scraper.")
        for bid in bad_ids:
            # Hapus episodes palsu
            await conn.execute('DELETE FROM episodes WHERE "anilistId" = $1', bid)
            # Hapus mapping yang salah
            await conn.execute('DELETE FROM anime_mappings WHERE "anilistId" = $1', bid)
        print("✅ Mapping dan episode palsu telah dihapus.")
    else:
        print("✅ Tidak ada mapping yang salah.")
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
