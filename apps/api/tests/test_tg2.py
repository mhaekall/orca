import os
import sys

sys.path.append(os.path.abspath("../../"))
import asyncio

from dotenv import load_dotenv

load_dotenv()
from services.ingestion.uploader.telegram import TelegramUploader


async def test():
    with open("dummy2.ts", "wb") as f:
        f.write(b"test segment")

    uploader = TelegramUploader()
    res = await uploader.upload_file("dummy2.ts")
    print(res)


asyncio.run(test())
