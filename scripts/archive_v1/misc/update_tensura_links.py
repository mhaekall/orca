import asyncio
import os
from databases import Database
from dotenv import load_dotenv

load_dotenv("apps/api/.env")

correct_urls = {
    2.0: "https://tele-proxy.moehamadhkl.workers.dev/stream/bot8640932204:AAEzRhYIrbfRsfsI62aaQcWr-39xO7t1VX0/BQACAgUAAyEGAATc0SFaAAEBcC9qAAF7CvfssivBAAFR7Scy9x3EyBlvAAKhHQACLRQAAVSB4KJUPFe3fTsE.m3u8",
    3.0: "https://tele-proxy.moehamadhkl.workers.dev/stream/bot8640932204:AAEzRhYIrbfRsfsI62aaQcWr-39xO7t1VX0/BQACAgUAAyEGAATc0SFaAAEBcEhqAAF7R8fCzrm64Hs84RRlh1A7_gEAArsdAAItFAABVNjzp0j-7yz_OwQ.m3u8",
    4.0: "https://tele-proxy.moehamadhkl.workers.dev/stream/bot8640932204:AAEzRhYIrbfRsfsI62aaQcWr-39xO7t1VX0/BQACAgUAAyEGAATc0SFaAAEBcFRqAAF7XfvawCwTImhvt73IxVd4Hj8AAscdAAItFAABVEaOSvGchxi2OwQ.m3u8"
}

async def main():
    db = Database(os.getenv("DATABASE_URL"))
    await db.connect()
    
    anilist_id = 182205
    
    for ep_num, url in correct_urls.items():
        # First find the episode ID
        row = await db.fetch_one("""
            SELECT id FROM episodes 
            WHERE "anilistId" = :aid AND "episodeNumber" = :ep LIMIT 1
        """, {"aid": anilist_id, "ep": ep_num})
        
        if row:
            ep_id = row['id']
            # Delete cache based on the episode's current URL
            await db.execute('DELETE FROM video_cache WHERE "episodeUrl" = (SELECT "episodeUrl" FROM episodes WHERE id = :id)', {"id": ep_id})
            
            # Update url
            await db.execute("""
                UPDATE episodes 
                SET "episodeUrl" = :url, "providerId" = 'telegram_swarm' 
                WHERE id = :id
            """, {"url": url, "id": ep_id})
            
            print(f"✅ Successfully updated DB for Tensura S4 Eps {ep_num}")
        else:
            print(f"❌ Could not find DB row for Tensura S4 Eps {ep_num}")

    await db.disconnect()

asyncio.run(main())