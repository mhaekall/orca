from fastapi import APIRouter
from sqlalchemy import delete, func
from sqlalchemy.dialects.postgresql import insert as pg_insert

from db.connection import database
from db.models import collections
from schemas.collection import CollectionUpdate

router = APIRouter()


@router.get("")
async def get_collection(user_id: str):
    query = """
        SELECT c.*, 
               m."coverImage" as "coverImage",
               m."cleanTitle" as "cleanTitle",
               m."nativeTitle" as "nativeTitle",
               COALESCE(ca.episode_count_actual, m."totalEpisodes") as "totalEpisodes",
               (SELECT MAX("episodeNumber") FROM episodes e WHERE e."anilistId" = m."anilistId") as "latestEpisode"
        FROM collections c
        LEFT JOIN anime_metadata m ON c."animeSlug" = CAST(m."anilistId" AS VARCHAR)
        LEFT JOIN canonical_anime ca ON m."anilistId" = ca.anilist_id
        WHERE c."userId" = :user_id
        ORDER BY c."updatedAt" DESC
    """
    rows = await database.fetch_all(query=query, values={"user_id": user_id})
    return [dict(row) for row in rows]


@router.post("")
async def save_collection(coll: CollectionUpdate):
    stmt = (
        pg_insert(collections)
        .values(
            userId=coll.user_id,
            animeSlug=coll.anilistId,
            status=coll.status,
            progress=coll.progress,
        )
        .on_conflict_do_update(
            index_elements=["userId", "animeSlug"],
            set_={"status": coll.status, "progress": coll.progress, "updatedAt": func.now()},
        )
    )
    await database.execute(stmt)
    return {"success": True}


@router.delete("")
async def remove_collection(user_id: str, anilistId: str):
    stmt = delete(collections).where(
        (collections.c.userId == user_id) & (collections.c.animeSlug == anilistId)
    )
    await database.execute(stmt)
    return {"success": True}
