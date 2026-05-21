import asyncio
import os
import sys
sys.path.insert(0, os.path.abspath('.'))
from db.connection import database
import re
from collections import defaultdict

async def main():
    await database.connect()
    
    # Data mentah dari output script recovery sebelumnya
    raw_data = """
[OK] Anime 174576 Ep 1.0 -> Recovered
[OK] Anime 182578 Ep 4.0 -> Recovered
[OK] Anime 174576 Ep 2.0 -> Recovered
[OK] Anime 182205 Ep 6.0 -> Recovered
[OK] Anime 101280 Ep 3.0 -> Recovered
[OK] Anime 180745 Ep 3.0 -> Recovered
[OK] Anime 21 Ep 1140.0 -> Recovered
[OK] Anime 101280 Ep 18.0 -> Recovered
[OK] Anime 101280 Ep 13.0 -> Recovered
[OK] Anime 101280 Ep 23.0 -> Recovered
[OK] Anime 101280 Ep 8.0 -> Recovered
[OK] Anime 21 Ep 33.0 -> Recovered
[OK] Anime 101280 Ep 7.0 -> Recovered
[OK] Anime 101280 Ep 21.0 -> Recovered
[OK] Anime 101280 Ep 9.0 -> Recovered
[OK] Anime 101280 Ep 11.0 -> Recovered
[OK] Anime 101280 Ep 12.0 -> Recovered
[OK] Anime 101280 Ep 17.0 -> Recovered
[OK] Anime 189046 Ep 1.0 -> Recovered
[OK] Anime 147105 Ep 3.0 -> Recovered
[OK] Anime 21 Ep 1146.0 -> Recovered
[OK] Anime 101280 Ep 16.0 -> Recovered
[OK] Anime 21 Ep 1140.0 -> Recovered
[OK] Anime 101280 Ep 22.0 -> Recovered
[OK] Anime 101280 Ep 3.0 -> Recovered
[OK] Anime 101280 Ep 10.0 -> Recovered
[OK] Anime 21 Ep 1154.0 -> Recovered
[OK] Anime 21 Ep 1158.0 -> Recovered
[OK] Anime 170019 Ep 1.0 -> Recovered
[OK] Anime 21 Ep 1158.0 -> Recovered
[OK] Anime 21 Ep 1152.0 -> Recovered
[OK] Anime 147105 Ep 1.0 -> Recovered
[OK] Anime 21 Ep 1143.0 -> Recovered
[OK] Anime 21 Ep 1142.0 -> Recovered
[OK] Anime 189987 Ep 2.0 -> Recovered
[OK] Anime 195268 Ep 3.0 -> Recovered
[OK] Anime 21 Ep 1153.0 -> Recovered
[OK] Anime 21 Ep 1147.0 -> Recovered
[OK] Anime 21 Ep 1144.0 -> Recovered
[OK] Anime 21 Ep 1157.0 -> Recovered
[OK] Anime 21 Ep 1155.0 -> Recovered
[OK] Anime 21 Ep 1142.0 -> Recovered
[OK] Anime 195268 Ep 5.0 -> Recovered
[FAIL] Anime 206914 Ep 1.0 -> No matching token found
[OK] Anime 21 Ep 1154.0 -> Recovered
[OK] Anime 21 Ep 1140.0 -> Recovered
[OK] Anime 158036 Ep 5.0 -> Recovered
[OK] Anime 182300 Ep 1.0 -> Recovered
[OK] Anime 194317 Ep 1.0 -> Recovered
[OK] Anime 197824 Ep 1.0 -> Recovered
[OK] Anime 21 Ep 1157.0 -> Recovered
[OK] Anime 194317 Ep 6.0 -> Recovered
[OK] Anime 182483 Ep 2.0 -> Recovered
[OK] Anime 190704 Ep 3.0 -> Recovered
[OK] Anime 182483 Ep 1.0 -> Recovered
[OK] Anime 195268 Ep 3.0 -> Recovered
[OK] Anime 192808 Ep 1.0 -> Recovered
[OK] Anime 182300 Ep 1.0 -> Recovered
[OK] Anime 189046 Ep 1.0 -> Recovered
[OK] Anime 147105 Ep 3.0 -> Recovered
[OK] Anime 21 Ep 1146.0 -> Recovered
[OK] Anime 195600 Ep 1.0 -> Recovered
[OK] Anime 147105 Ep 1.0 -> Recovered
[OK] Anime 190704 Ep 2.0 -> Recovered
[OK] Anime 101280 Ep 11.0 -> Recovered
[OK] Anime 101280 Ep 14.0 -> Recovered
[OK] Anime 101280 Ep 13.0 -> Recovered
[OK] Anime 101280 Ep 14.0 -> Recovered
[OK] Anime 101280 Ep 2.0 -> Recovered
[FAIL] Anime 156040 Ep 7.0 -> No matching token found
[OK] Anime 101280 Ep 7.0 -> Recovered
[OK] Anime 101280 Ep 21.0 -> Recovered
[OK] Anime 101280 Ep 8.0 -> Recovered
[OK] Anime 101280 Ep 18.0 -> Recovered
[OK] Anime 156040 Ep 11.0 -> Recovered
[OK] Anime 156040 Ep 4.0 -> Recovered
[OK] Anime 101280 Ep 9.0 -> Recovered
[OK] Anime 156040 Ep 2.0 -> Recovered
[OK] Anime 156040 Ep 3.0 -> Recovered
[OK] Anime 101280 Ep 15.0 -> Recovered
[OK] Anime 156040 Ep 5.0 -> Recovered
[OK] Anime 101280 Ep 16.0 -> Recovered
[OK] Anime 101280 Ep 15.0 -> Recovered
[OK] Anime 101280 Ep 19.0 -> Recovered
[OK] Anime 101280 Ep 19.0 -> Recovered
[OK] Anime 101280 Ep 17.0 -> Recovered
[OK] Anime 101280 Ep 2.0 -> Recovered
[OK] Anime 101280 Ep 10.0 -> Recovered
[OK] Anime 101280 Ep 12.0 -> Recovered
[OK] Anime 101280 Ep 3.0 -> Recovered
[OK] Anime 101280 Ep 23.0 -> Recovered
[OK] Anime 101280 Ep 22.0 -> Recovered
[OK] Anime 101280 Ep 20.0 -> Recovered
[OK] Anime 101280 Ep 23.0 -> Recovered
[OK] Anime 101280 Ep 4.0 -> Recovered
[OK] Anime 101280 Ep 20.0 -> Recovered
[OK] Anime 101280 Ep 4.0 -> Recovered
[OK] Anime 156040 Ep 12.0 -> Recovered
[OK] Anime 101280 Ep 6.0 -> Recovered
[OK] Anime 101280 Ep 5.0 -> Recovered
[OK] Anime 101280 Ep 5.0 -> Recovered
[OK] Anime 101280 Ep 4.0 -> Recovered
[OK] Anime 156040 Ep 8.0 -> Recovered
[OK] Anime 182483 Ep 1.0 -> Recovered
[OK] Anime 101280 Ep 6.0 -> Recovered
[OK] Anime 179950 Ep 6.0 -> Recovered
[OK] Anime 182483 Ep 2.0 -> Recovered
[OK] Anime 195268 Ep 5.0 -> Recovered
[OK] Anime 194317 Ep 6.0 -> Recovered
[OK] Anime 189046 Ep 1.0 -> Recovered
[OK] Anime 194317 Ep 1.0 -> Recovered
[OK] Anime 197824 Ep 1.0 -> Recovered
[OK] Anime 195600 Ep 2.0 -> Recovered
[OK] Anime 21 Ep 1143.0 -> Recovered
[OK] Anime 170019 Ep 1.0 -> Recovered
[OK] Anime 21 Ep 1144.0 -> Recovered
[OK] Anime 21 Ep 1142.0 -> Recovered
[OK] Anime 21 Ep 1143.0 -> Recovered
[OK] Anime 21 Ep 1144.0 -> Recovered
[OK] Anime 21 Ep 33.0 -> Recovered
[OK] Anime 21 Ep 140.0 -> Recovered
[OK] Anime 21 Ep 1147.0 -> Recovered
[OK] Anime 21 Ep 1154.0 -> Recovered
[OK] Anime 21 Ep 1157.0 -> Recovered
[OK] Anime 21 Ep 1155.0 -> Recovered
[OK] Anime 21 Ep 1158.0 -> Recovered
[OK] Anime 21 Ep 1155.0 -> Recovered
[OK] Anime 21 Ep 1152.0 -> Recovered
[OK] Anime 21 Ep 140.0 -> Recovered
[OK] Anime 21 Ep 1147.0 -> Recovered
[OK] Anime 21 Ep 1146.0 -> Recovered
[OK] Anime 195333 Ep 6.0 -> Recovered
[OK] Anime 21 Ep 1153.0 -> Recovered
[OK] Anime 21 Ep 1152.0 -> Recovered
[OK] Anime 21 Ep 1153.0 -> Recovered
    """
    
    recovered = defaultdict(list)
    failed = defaultdict(list)
    ids = set()
    
    for line in raw_data.split('\n'):
        line = line.strip()
        if not line: continue
        
        match = re.search(r'\[(OK|FAIL)\] Anime (\d+) Ep ([\d\.]+) ->', line)
        if match:
            status, aid, ep = match.groups()
            aid = int(aid)
            ep = float(ep)
            if ep.is_integer():
                ep = int(ep)
            ids.add(aid)
            
            if status == "OK":
                recovered[aid].append(ep)
            else:
                failed[aid].append(ep)
                
    query = 'SELECT "anilistId", "cleanTitle" FROM anime_metadata WHERE "anilistId" = ANY(:ids)'
    res = await database.fetch_all(query, {"ids": list(ids)})
    mapping = {r["anilistId"]: r["cleanTitle"] for r in res}
    
    print("=== BERHASIL DI-RECOVER (133 Episode, telah diformat) ===")
    for aid, eps in recovered.items():
        title = mapping.get(aid, f"Unknown Anime ({aid})")
        eps = sorted(list(set(eps)))
        print(f"\\n✅ {title}")
        print(f"   Episode: {', '.join(map(str, eps))}")
        
    print("\\n=== GAGAL (KUNCI BOT SUDAH HANGUS) (2 Episode) ===")
    for aid, eps in failed.items():
        title = mapping.get(aid, f"Unknown Anime ({aid})")
        eps = sorted(list(set(eps)))
        print(f"\n❌ {title}")
        print(f"   Episode: {', '.join(map(str, eps))}")

if __name__ == "__main__":
    asyncio.run(main())

