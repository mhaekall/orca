import asyncio
import os

from databases import Database

db_url = os.environ.get(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_fZdiqVplkn82@ep-delicate-breeze-aonlkw7n-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
)

if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

async def main():
    database = Database(db_url)
    await database.connect()
    try:
        query = "SELECT * FROM swarm_vault;"
        vault_rows = await database.fetch_all(query)
        print(f"Total rows in swarm_vault: {len(vault_rows)}")
        
        updates = 0
        for row in vault_rows:
            # check if episode exists in 'episodes' table with same anilistId and episodeNumber
            ep_query = """
                SELECT id, "episodeUrl", "providerId" FROM episodes 
                WHERE "anilistId" = :anilistId AND "episodeNumber" = :episodeNumber AND "providerId" = :providerId
            """
            ep = await database.fetch_one(ep_query, {"anilistId": row['anilistId'], "episodeNumber": row['episodeNumber'], "providerId": row['providerId']})
            
            if ep:
                if ep["episodeUrl"] != row["episodeUrl"]:
                    update_q = """
                        UPDATE episodes SET "episodeUrl" = :newUrl, "updatedAt" = NOW() 
                        WHERE id = :id
                    """
                    await database.execute(update_q, {"newUrl": row["episodeUrl"], "id": ep["id"]})
                    updates += 1
            else:
                # Insert into episodes if missing
                insert_q = """
                    INSERT INTO episodes ("anilistId", "providerId", "episodeNumber", "episodeUrl", "updatedAt")
                    VALUES (:anilistId, :providerId, :episodeNumber, :episodeUrl, NOW())
                """
                await database.execute(insert_q, {
                    "anilistId": row['anilistId'],
                    "providerId": row['providerId'],
                    "episodeNumber": row['episodeNumber'],
                    "episodeUrl": row['episodeUrl']
                })
                updates += 1
                
        print(f"Total episodes table records updated/inserted from swarm_vault: {updates}")
    except Exception as e:
        print(f"Error querying DB: {e}")
    finally:
        await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
