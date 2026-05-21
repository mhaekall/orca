import asyncio
from db.connection import database

async def main():
    await database.connect()
    # Check columns in watch_history
    wh_cols = await database.fetch_all("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'watch_history'")
    print("watch_history:", [dict(r) for r in wh_cols])
    col_cols = await database.fetch_all("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'collections'")
    print("collections:", [dict(r) for r in col_cols])
    await database.disconnect()

asyncio.run(main())
