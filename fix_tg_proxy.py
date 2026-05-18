import asyncio
import os
import re

from databases import Database

db_url = os.environ.get(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_fZdiqVplkn82@ep-delicate-breeze-aonlkw7n-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
)

if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Default token to use if we rewrite
DEFAULT_TOKEN = "7328759161:AAGhAbS5jy9HWt7qHJnPAZsuCIOmTyDtKw0"

async def main():
    database = Database(db_url)
    await database.connect()
    
    try:
        # Fetch both episodes and swarm_vault to fix both
        print("Checking for old 'tg-proxy' URLs...")
        
        ep_query = """
            SELECT id, "episodeUrl" FROM episodes 
            WHERE "episodeUrl" LIKE '%tg-proxy%' AND "episodeUrl" NOT LIKE '%/stream/bot%'
        """
        eps_rows = await database.fetch_all(ep_query)
        
        vault_query = """
            SELECT id, "episodeUrl" FROM swarm_vault 
            WHERE "episodeUrl" LIKE '%tg-proxy%' AND "episodeUrl" NOT LIKE '%/stream/bot%'
        """
        vault_rows = await database.fetch_all(vault_query)
        
        print(f"Found {len(eps_rows)} episodes and {len(vault_rows)} vault entries to fix.")
        
        # Regex to extract file_id from old url format like: https://tg-proxy.moehamadhkl.workers.dev/BQACAgUAAyEGAATc0SFaAAMkadrcTCsz9C08LyIQzIk5OtbtZw8AAvIbAAJSidhWkIrMPA3jiHo7BA
        pattern = re.compile(r'workers\.dev\/([^/]+)$')
        
        updates_ep = 0
        for row in eps_rows:
            url = row["episodeUrl"]
            match = pattern.search(url)
            if match:
                file_id = match.group(1)
                new_url = f"https://tele-proxy.moehamadhkl.workers.dev/stream/bot{DEFAULT_TOKEN}/{file_id}"
                
                await database.execute(
                    "UPDATE episodes SET \"episodeUrl\" = :new_url WHERE id = :id",
                    {"new_url": new_url, "id": row["id"]}
                )
                updates_ep += 1
                
        updates_vault = 0
        for row in vault_rows:
            url = row["episodeUrl"]
            match = pattern.search(url)
            if match:
                file_id = match.group(1)
                new_url = f"https://tele-proxy.moehamadhkl.workers.dev/stream/bot{DEFAULT_TOKEN}/{file_id}"
                
                await database.execute(
                    "UPDATE swarm_vault SET \"episodeUrl\" = :new_url WHERE id = :id",
                    {"new_url": new_url, "id": row["id"]}
                )
                updates_vault += 1
                
        print(f"Updated {updates_ep} records in episodes table.")
        print(f"Updated {updates_vault} records in swarm_vault table.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
