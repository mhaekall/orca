import asyncio
import os
import sys
import logging
import subprocess

sys.path.insert(0, os.path.abspath('.'))
from dotenv import load_dotenv
load_dotenv()

from db.connection import database
from services.scraper.providers.kuronime.provider import KuronimeProvider
from services.transport import ProviderTransport
from services.ingestion.main import IngestionEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def process_episode(ep_num):
    url = f"https://kuronime.sbs/nonton-youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e-season-4-episode-{ep_num}/"
    provider_id = "kuronime"
    anilist_id = 180745

    print(f"\n--- Processing Episode {ep_num} ---")
    try:
        transport = ProviderTransport()
        provider = KuronimeProvider(transport)
        
        print(f"Fetching sources directly from Kuronime for {url}...")
        sources = await provider.get_episode_sources(url)
        
        if not sources:
            print("No sources found.")
            return

        print("Available sources for debugging:")
        for s in sources:
            print(s)
            
        direct_url = None
        quality = "Unknown"
        
        # Try Mp4upload 720p specifically for Ep 12
        for s in sources:
            if s.get("provider") == "Mp4upload" and s.get("quality") == "720p":
                embed_url = s.get("url")
                print(f"Extracting direct URL from {embed_url} using yt-dlp...")
                result = subprocess.run(["yt-dlp", "-g", embed_url], capture_output=True, text=True)
                lines = result.stdout.strip().split('\n')
                for line in reversed(lines):
                    if line.startswith("http"):
                        direct_url = line.strip()
                        quality = s.get("quality", "Unknown")
                        break
                if direct_url:
                    break

        if not direct_url:
            print("No suitable source found.")
            return

        print(f"Found direct source: {direct_url} (Quality: {quality})")

        engine = IngestionEngine()
        
        row = await database.fetch_one('SELECT id FROM episodes WHERE "anilistId" = :aid AND "episodeNumber" = :ep_num', {"aid": anilist_id, "ep_num": ep_num})
        if not row:
             print("Episode not found in DB")
             return
        
        ep_id = row["id"]

        print("Triggering ingestion...")
        success = await engine.process_episode(
            episode_id=ep_id,
            anilist_id=anilist_id,
            provider_id=provider_id,
            episode_number=ep_num,
            direct_video_url=direct_url,
            anime_title="Classroom of the Elite Season 4",
            video_quality=quality
        )
        print(f"Ingestion success: {success}")
    except Exception as e:
        print(f"Error processing episode {ep_num}: {e}")

async def main():
    await database.connect()
    try:
        for ep in [3]:
            await process_episode(ep)
            await asyncio.sleep(5)
    finally:
        await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
