import asyncio
from db.connection import database


async def main():
    print("First connect...")
    await database.connect()
    print("Second connect...")
    try:
        await database.connect()
        print("Success second connect!")
    except Exception as e:
        print(f"Error on second connect: {e}")
    await database.disconnect()


asyncio.run(main())
