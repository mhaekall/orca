import asyncio
import os
import httpx
from databases import Database
from dotenv import load_dotenv

load_dotenv("apps/api/.env")

corrupted_urls = {
    2.0: "https://tele-proxy.moehamadhkl.workers.dev/stream/bot8640932204:AAEzRhYIrbfRsfsI62aaQcWr-39xO7t1VX0/BQACAgUAAyEGAATc0SFaAAEBcC9qAAF7CvfssivBAAFR7Scy9x3EyBlvAAKhHQACLRQAAVSB4KJUPFe3fTsE.m3u8",
    3.0: "https://tele-proxy.moehamadhkl.workers.dev/stream/bot8640932204:AAEzRhYIrbfRsfsI62aaQcWr-39xO7t1VX0/BQACAgUAAyEGAATc0SFaAAEBcEhqAAF7R8fCzrm64Hs84RRlh1A7_gEAArsdAAItFAABVNjzp0j-7yz_OwQ.m3u8",
    4.0: "https://tele-proxy.moehamadhkl.workers.dev/stream/bot8640932204:AAEzRhYIrbfRsfsI62aaQcWr-39xO7t1VX0/BQACAgUAAyEGAATc0SFaAAEBcFRqAAF7XfvawCwTImhvt73IxVd4Hj8AAscdAAItFAABVEaOSvGchxi2OwQ.m3u8"
}

tokens = [v for k,v in os.environ.items() if k.startswith("TELEGRAM_BOT_TOKEN") and v]

async def resolve_chunk_owner(client, file_id):
    # Test all tokens concurrently to be fast
    async def check_token(t):
        url = f"https://api.telegram.org/bot{t}/getFile?file_id={file_id}"
        try:
            res = await client.get(url, timeout=10)
            if res.status_code == 200 and res.json().get("ok"):
                return t
        except:
            pass
        return None

    tasks = [check_token(t) for t in tokens]
    results = await asyncio.gather(*tasks)
    for r in results:
        if r:
            return r
    return None

async def reconstruct_playlist(client, ep_num, url):
    print(f"Reconstructing Eps {ep_num}...")
    res = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
    if res.status_code != 200:
        print(f"Failed to fetch {url}")
        return None
        
    lines = res.text.splitlines()
    new_lines = []
    
    # Extract file_ids
    for i, line in enumerate(lines):
        if line.startswith("http"):
            file_id = line.split("/")[-1]
            owner_token = await resolve_chunk_owner(client, file_id)
            if owner_token:
                new_lines.append(f"https://tele-proxy.moehamadhkl.workers.dev/stream/bot{owner_token}/{file_id}")
            else:
                print(f"  ❌ FATAL: Could not find owner for chunk {file_id[:15]}...")
                return None
        else:
            new_lines.append(line)
            
    # Save locally
    m3u8_content = "\n".join(new_lines)
    local_path = f"eps_{ep_num}_recovered.m3u8"
    with open(local_path, "w") as f:
        f.write(m3u8_content)
        
    print(f"✅ Successfully reconstructed Eps {ep_num} -> {local_path}")
    return local_path

async def main():
    limits = httpx.Limits(max_connections=200, max_keepalive_connections=50)
    async with httpx.AsyncClient(limits=limits) as client:
        for ep_num, url in corrupted_urls.items():
            await reconstruct_playlist(client, ep_num, url)

asyncio.run(main())