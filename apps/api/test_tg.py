import asyncio

from dotenv import load_dotenv

load_dotenv()

from telegram import TelegramUploader


async def test():
    with open("dummy.ts", "wb") as f:
        f.write(b"test segment")

    uploader = TelegramUploader()
    res = await uploader.upload_file("dummy.ts")
    print(res)

asyncio.run(test())
