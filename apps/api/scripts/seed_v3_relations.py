import asyncio
import os
import sys

from sqlalchemy import select

# Setup path so we can import apps/api modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from db.connection import async_engine
from db.models import anime_genres, anime_metadata, anime_studios, genres, studios
from services.anilist import fetch_anilist_info_by_id


async def seed_v3_relations():
    async with async_engine.begin() as conn:
        # Get all current anime
        result = await conn.execute(select(anime_metadata.c.anilistId))
        anime_ids = [row[0] for row in result.fetchall()]

        print(f"Starting V3 data migration for {len(anime_ids)} anime records...")

        for idx, anilist_id in enumerate(anime_ids):
            print(f"[{idx + 1}/{len(anime_ids)}] Fetching rich metadata for ID {anilist_id}...")
            
            rich_data = await fetch_anilist_info_by_id(anilist_id)
            if not rich_data:
                continue
                
            rich_genres = rich_data.get("genres", [])
            rich_studios = rich_data.get("studios", [])
            rich_relations = rich_data.get("relations", [])
            
            # Update the JSONB columns as fallback/legacy support
            await conn.execute(
                anime_metadata.update()
                .where(anime_metadata.c.anilistId == anilist_id)
                .values(genres=rich_genres, studios=rich_studios, relations=rich_relations)
            )

            # Insert into normalized genres and map
            for g_name in rich_genres:
                # Upsert genre
                g_res = await conn.execute(
                    select(genres.c.id).where(genres.c.name == g_name)
                )
                g_row = g_res.fetchone()
                if g_row:
                    g_id = g_row[0]
                else:
                    insert_res = await conn.execute(
                        genres.insert().values(name=g_name).returning(genres.c.id)
                    )
                    g_id = insert_res.fetchone()[0]

                # Upsert mapping
                try:
                    await conn.execute(
                        anime_genres.insert().values(anilistId=anilist_id, genre_id=g_id)
                    )
                except Exception:
                    pass  # Already exists

            # Insert into normalized studios and map
            for s_name in rich_studios:
                # Upsert studio
                s_res = await conn.execute(
                    select(studios.c.id).where(studios.c.name == s_name)
                )
                s_row = s_res.fetchone()
                if s_row:
                    s_id = s_row[0]
                else:
                    insert_res = await conn.execute(
                        studios.insert().values(name=s_name).returning(studios.c.id)
                    )
                    s_id = insert_res.fetchone()[0]

                # Upsert mapping
                try:
                    await conn.execute(
                        anime_studios.insert().values(anilistId=anilist_id, studio_id=s_id)
                    )
                except Exception:
                    pass  # Already exists
                    
            # Brief sleep to avoid hitting API rate limits
            await asyncio.sleep(0.5)

        print("\nV3 Schema Migration and Enrichment Complete!")


if __name__ == "__main__":
    asyncio.run(seed_v3_relations())
