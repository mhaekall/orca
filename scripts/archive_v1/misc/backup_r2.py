import asyncio
import os
import re
import httpx
from databases import Database
from dotenv import load_dotenv

load_dotenv("apps/api/.env")

def clean_filename(title):
    if not title:
        return "Unknown"
    title = re.sub(r'[^a-zA-Z0-9_\- ]', '', title)
    title = title.replace(" ", "_")
    return title

async def backup_episode(sem, db, ep_id, anilist_id, ep_num, title, url):
    async with sem:
        folder_name = f"{anilist_id}_{clean_filename(title)}"
        ep_str = str(int(ep_num)) if ep_num == int(ep_num) else str(ep_num)
        
        if not url.endswith('.m3u8'):
            fetch_url = url + '.m3u8'
        else:
            fetch_url = url
            
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(fetch_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
                if res.status_code == 200 and "#EXTM3U" in res.text:
                    local_dir = f"tmp_r2_backup/{folder_name}"
                    os.makedirs(local_dir, exist_ok=True)
                    local_file = f"{local_dir}/eps_{ep_str}.m3u8"
                    
                    with open(local_file, "w") as f:
                        f.write(res.text)
                    
                    r2_key = f"{folder_name}/eps_{ep_str}.m3u8"
                    
                    # Run wrangler WITH --remote flag
                    cmd = f"npx wrangler r2 object put anime-m3u8-backup/{r2_key} --file {local_file} --remote"
                    
                    proc = await asyncio.create_subprocess_shell(
                        cmd,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    stdout, stderr = await proc.communicate()
                    
                    if proc.returncode == 0:
                        return True
                    else:
                        print(f"Failed to upload {r2_key} to R2. Error: {stderr.decode().strip()[-100:]}")
                        return False
                else:
                    # Silently ignore the 400s as they are the corrupted ones
                    return False
        except Exception as e:
            return False

async def main():
    db = Database(os.getenv("DATABASE_URL"))
    await db.connect()
    
    query = """
    SELECT e.id, e."anilistId", e."episodeNumber", e."episodeUrl", a."cleanTitle", a."nativeTitle"
    FROM episodes e
    LEFT JOIN anime_metadata a ON e."anilistId" = a."anilistId"
    WHERE e."episodeUrl" LIKE '%tele-proxy%' OR e."episodeUrl" LIKE '%workers.dev%'
    """
    
    rows = await db.fetch_all(query)
    print(f"Found {len(rows)} episodes to process...")
    
    os.makedirs("tmp_r2_backup", exist_ok=True)
    
    sem = asyncio.Semaphore(15)
    tasks = []
    
    for r in rows:
        title = r['cleanTitle'] or r['nativeTitle']
        tasks.append(
            backup_episode(sem, db, r['id'], r['anilistId'], r['episodeNumber'], title, r['episodeUrl'])
        )
        
    results = await asyncio.gather(*tasks)
    
    success = sum(1 for r in results if r)
    print(f"✅ Successfully backed up {success} healthy M3U8 playlists to Cloudflare R2!")
    
    await db.disconnect()

asyncio.run(main())