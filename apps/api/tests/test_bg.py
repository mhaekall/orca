import asyncio
from db.connection import database
from services.queue import QStashPublisher


async def main():
    print("Connecting to DB (like FastAPI startup)...")
    await database.connect()

    print("Spawning batch worker...")
    QStashPublisher.spawn_batch_worker(0, 1)

    print("Waiting 10 seconds to see if it crashes...")
    await asyncio.sleep(10)

    await database.disconnect()


asyncio.run(main())
