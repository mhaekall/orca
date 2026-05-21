import asyncio
from db.connection import database

async def migrate():
    await database.connect()
    try:
        # Check if animeSlug exists
        res = await database.fetch_val("SELECT column_name FROM information_schema.columns WHERE table_name='watch_history' AND column_name='animeSlug'")
        if res:
            print("Renaming animeSlug to anilist_id in watch_history...")
            await database.execute('ALTER TABLE watch_history RENAME COLUMN "animeSlug" TO anilist_id')
        
        # Change type of anilist_id to VARCHAR just to be sure
        await database.execute('ALTER TABLE watch_history ALTER COLUMN anilist_id TYPE VARCHAR')
        
        res = await database.fetch_val("SELECT column_name FROM information_schema.columns WHERE table_name='collections' AND column_name='animeSlug'")
        if res:
            print("Renaming animeSlug to anilist_id in collections...")
            await database.execute('ALTER TABLE collections RENAME COLUMN "animeSlug" TO anilist_id')
        
        # Change type of anilist_id to VARCHAR just to be sure
        await database.execute('ALTER TABLE collections ALTER COLUMN anilist_id TYPE VARCHAR')

        print("Migration complete.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await database.disconnect()

if __name__ == "__main__":
    asyncio.run(migrate())
