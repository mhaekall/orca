import httpx
import os
import asyncio
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath('.'))
from db.connection import database

load_dotenv("apps/api/.env")

# Load all bot tokens
tokens = [v for k, v in os.environ.items() if k.startswith("TELEGRAM_BOT_TOKEN") and v]

async def test_token(client, token, file_id):
    url = f"https://api.telegram.org/bot{token}/getFile?file_id={file_id}"
    try:
        resp = await client.get(url)
        if resp.status_code == 200:
            return token
    except:
        pass
    return None

async def process_episode(client, ep_id, old_url):
    # Extract file_id from URL
    file_id = old_url.split("/")[-1]
    if "?" in file_id:
        file_id = file_id.split("?")[0]

    # Test against all tokens concurrently
    tasks = [test_token(client, t, file_id) for t in tokens]
    results = await asyncio.gather(*tasks)
    
    valid = [r for r in results if r]
    if valid:
        token = valid[0]
        new_url = f"https://tele-proxy.moehamadhkl.workers.dev/stream/bot{token}/{file_id}"
        
        # Update DB
        query = 'UPDATE episodes SET "episodeUrl" = :new_url WHERE id = :id'
        await database.execute(query, {"new_url": new_url, "id": ep_id})
        return True, new_url
    else:
        return False, None

async def main():
    await database.connect()
    print(f"Loaded {len(tokens)} bot tokens from .env")
    
    query = 'SELECT id, "episodeUrl", "anilistId", "episodeNumber" FROM episodes WHERE "episodeUrl" LIKE \'%tg-proxy%\''
    episodes = await database.fetch_all(query)
    
    print(f"Found {len(episodes)} episodes using legacy tg-proxy format.")
    
    if not episodes:
        await database.disconnect()
        return

    success_count = 0
    fail_count = 0
    
    # Process with semaphore to avoid overwhelming Telegram API (Rate Limits 429)
    sem = asyncio.Semaphore(10)
    
    async def bounded_process(client, ep):
        async with sem:
            success, new_url = await process_episode(client, ep["id"], ep["episodeUrl"])
            if success:
                print(f"[OK] Anime {ep['anilistId']} Ep {ep['episodeNumber']} -> Recovered")
                return True
            else:
                print(f"[FAIL] Anime {ep['anilistId']} Ep {ep['episodeNumber']} -> No matching token found")
                return False

    # Use a connection pool for httpx
    limits = httpx.Limits(max_keepalive_connections=50, max_connections=100)
    async with httpx.AsyncClient(timeout=10, limits=limits) as client:
        tasks = [bounded_process(client, ep) for ep in episodes]
        results = await asyncio.gather(*tasks)
        
        success_count = sum(1 for r in results if r)
        fail_count = len(results) - success_count

    print(f"\n--- Recovery Summary ---")
    print(f"Total processed : {len(episodes)}")
    print(f"Successfully recovered: {success_count}")
    print(f"Failed to recover   : {fail_count}")
    
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
