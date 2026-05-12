import asyncio
import os

import httpx


async def stream_logs():
    url = "https://huggingface.co/api/spaces/jonyyyyyyyu/anime-scraper-api/logs"
    headers = {"Authorization": f"Bearer {os.environ.get('HF_TOKEN')}"}

    print("[MENGHUBUNGKAN KE HUGGING FACE SPACE LOGS...]")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            async with client.stream("GET", url, headers=headers) as response:
                if response.status_code != 200:
                    print(f"Gagal mengambil log: HTTP {response.status_code}")
                    return

                count = 0
                async for line in response.aiter_lines():
                    if line:
                        print(line)
                        count += 1
                    if count >= 30:  # Ambil 30 baris terakhir/terbaru
                        break
    except Exception as e:
        print(f"Error fetching logs: {e}")


asyncio.run(stream_logs())
