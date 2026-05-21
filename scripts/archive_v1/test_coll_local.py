import asyncio
from db.connection import database
from schemas.collection import CollectionUpdate
from routes.collection import save_collection
from sqlalchemy import text

async def main():
    await database.connect()
    # Ensure testuser exists with required fields
    await database.execute(text("INSERT INTO \"user\" (id, name, email, \"emailVerified\", \"createdAt\", \"updatedAt\") VALUES ('testuser', 'Test User', 'test@example.com', false, now(), now()) ON CONFLICT DO NOTHING"))
    
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
        import traceback
        traceback.print_exc()
    await database.disconnect()

asyncio.run(main())
