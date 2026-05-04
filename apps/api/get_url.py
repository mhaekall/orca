import asyncio

import asyncpg
from dotenv import dotenv_values

env = dotenv_values(".env")

async def main():
    conn = await asyncpg.connect(env.get("DATABASE_URL"))
    rows = await conn.fetch("SELECT \"episodeUrl\" FROM episodes WHERE \"episodeUrl\" LIKE '%tele-proxy%' ORDER BY \"updatedAt\" DESC LIMIT 1;")
    for row in rows:
        print(row["episodeUrl"])
    await conn.close()

asyncio.run(main())
