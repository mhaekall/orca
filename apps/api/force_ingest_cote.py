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

async def main():
    await database.connect()
    url = "https://kuronime.sbs/nonton-youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e-season-3-episode-6/"
    provider_id = "kuronime"
    anilist_id = 146066
    ep_num = 6

    try:
        transport = ProviderTransport()
        provider = KuronimeProvider(transport)
        
        print("Fetching sources directly from Kuronime...")
        sources = await provider.get_episode_sources(url)
        
        if not sources:
            print("No sources found.")
            return

        best_source = None
        for s in sources:
            if s.get("provider") == "Mp4upload" and s.get("quality") == "1080p":
                best_source = s
                break

        if not best_source:
            # Fallback to 720p Mp4upload if 1080p not found
            for s in sources:
                if s.get("provider") == "Mp4upload" and s.get("quality") == "720p":
                    best_source = s
                    break

        if not best_source:
            print("No Mp4upload source found.")
            return

        embed_url = best_source.get("url")
        print(f"Extracting direct URL from {embed_url} using yt-dlp...")
        
        result = subprocess.run(["yt-dlp", "-g", embed_url], capture_output=True, text=True)
        if result.returncode != 0:
            print("Failed to extract using yt-dlp:", result.stderr)
            return
            
        direct_url = result.stdout.strip()
        quality = best_source.get("quality", "Unknown")
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
            anime_title="Classroom of the Elite Season 3",
            video_quality=quality
        )
        print(f"Ingestion success: {success}")
    finally:
        await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
