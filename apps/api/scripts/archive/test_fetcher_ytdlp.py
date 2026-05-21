import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath('.'))
from services.ingestion.core.fetcher import VideoFetcher

async def main():
    fetcher = VideoFetcher(output_dir="./tmp_test")
    # This URL should be handled by yt-dlp
    url = "https://www.mp4upload.com/embed-qw7x1gv987co.html"
    
    # Run fetch. We will cancel it if it takes too long.
    print("Testing fetch...")
    try:
        # We don't want to download the whole thing, just see if extraction works
        # and starts downloading the correct URL.
        # We will modify the fetcher or just cancel the task.
        task = asyncio.create_task(fetcher.fetch(url, "test_file.mp4"))
        await asyncio.sleep(15) # let it run for 15 seconds
        task.cancel()
        print("Test finished (cancelled). Check logs.")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
