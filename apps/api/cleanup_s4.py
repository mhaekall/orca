import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath('.'))
from db.connection import database

async def main():
    await database.connect()
    
    anilist_id = 180745
    
    print(f"Cleaning up duplicate rows for COTE S4 (AniList: {anilist_id})...")
    
    # Ambil semua episode S4
    query = 'SELECT id, "episodeNumber", "episodeUrl", "providerId" FROM episodes WHERE "anilistId" = :aid'
    episodes = await database.fetch_all(query, {"aid": anilist_id})
    
    # Kelompokkan berdasarkan episodeNumber
    ep_map = {}
    for ep in episodes:
        num = ep["episodeNumber"]
        if num not in ep_map:
            ep_map[num] = []
        ep_map[num].append(dict(ep))
        
    deleted_count = 0
    for num, rows in ep_map.items():
        if len(rows) > 1:
            # Cari mana yang punya tele-proxy
            tele_rows = [r for r in rows if "tele-proxy" in (r["episodeUrl"] or "")]
            if tele_rows:
                # Keep the first tele-proxy row, delete the rest
                keep_id = tele_rows[0]["id"]
                delete_ids = [r["id"] for r in rows if r["id"] != keep_id]
                
                if delete_ids:
                    print(f"Ep {num}: Keeping ID {keep_id} ({tele_rows[0]['episodeUrl'][:40]}...), Deleting IDs {delete_ids}")
                    del_query = "DELETE FROM episodes WHERE id = ANY(:ids)"
                    await database.execute(del_query, {"ids": delete_ids})
                    deleted_count += len(delete_ids)
            else:
                # Kalau nggak ada tele-proxy, keep the first one
                keep_id = rows[0]["id"]
                delete_ids = [r["id"] for r in rows if r["id"] != keep_id]
                if delete_ids:
                    print(f"Ep {num}: No tele-proxy. Keeping ID {keep_id}, Deleting IDs {delete_ids}")
                    del_query = "DELETE FROM episodes WHERE id = ANY(:ids)"
                    await database.execute(del_query, {"ids": delete_ids})
                    deleted_count += len(delete_ids)
                    
    print(f"Cleanup finished! Deleted {deleted_count} duplicate rows.")
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
