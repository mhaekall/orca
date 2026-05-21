import asyncio
from db.connection import database
from schemas.collection import CollectionUpdate
from routes.collection import save_collection

async def main():
    await database.connect()
    coll = CollectionUpdate(
        user_id="testuser",
        anilistId="132029",
        status="plan_to_watch",
        progress=0,
        title="Dandadan",
        img="https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx132029-prGF4gePdSKv.jpg",
        mediaType="manga"
    )
    try:
        res = await save_collection(coll)
        print("Success:", res)
    except Exception as e:
        print("Error:", e)
    await database.disconnect()

asyncio.run(main())
