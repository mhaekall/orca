import asyncio
import os
import time

import requests
from dotenv import load_dotenv

load_dotenv()
from telegram import TelegramUploader


async def test():
    print("1. Creating dummy video chunk...")
    with open("dummy.ts", "wb") as f:
        # Create a 2MB dummy file to test range requests properly
        f.write(os.urandom(2 * 1024 * 1024))

    print("2. Uploading to Telegram...")
    uploader = TelegramUploader()
    res = await uploader.upload_file("dummy.ts")
    print(f"Upload success! Result: {res}")

    proxy_url = res["url"]
    print(f"\nTarget Proxy URL: {proxy_url}")

    print("\n--- TEST 1: Request Without Range Header (Expecting 200 OK) ---")
    print("A. First Request (Should be MISS)")
    r1 = requests.get(proxy_url)
    print(
        f"Status: {r1.status_code}, X-Proxy-Cache: {r1.headers.get('X-Proxy-Cache')}, Content-Length: {r1.headers.get('Content-Length')}"
    )

    print("B. Second Request (Should be HIT)")
    time.sleep(1)
    r2 = requests.get(proxy_url)
    print(
        f"Status: {r2.status_code}, X-Proxy-Cache: {r2.headers.get('X-Proxy-Cache')}, Content-Length: {r2.headers.get('Content-Length')}"
    )

    print("\n--- TEST 2: Request WITH Range Header (Expecting 206 Partial Content) ---")
    headers = {"Range": "bytes=0-1048575"}
    print("A. First Range Request (Should be MISS)")
    r3 = requests.get(proxy_url, headers=headers)
    print(
        f"Status: {r3.status_code}, X-Proxy-Cache: {r3.headers.get('X-Proxy-Cache')}, Content-Length: {r3.headers.get('Content-Length')}"
    )

    print("B. Second Range Request (Should be HIT)")
    time.sleep(3)
    r4 = requests.get(proxy_url, headers=headers)
    print(
        f"Status: {r4.status_code}, X-Proxy-Cache: {r4.headers.get('X-Proxy-Cache')}, Content-Length: {r4.headers.get('Content-Length')}"
    )


if __name__ == "__main__":
    asyncio.run(test())
