import sys

with open("apps/api/routes/collection.py", "r") as f:
    content = f.read()

# Replace get_collection query
query_replace = """    query = \"\"\"
        SELECT c.*,
               m."coverImage" as "coverImage",
               m."cleanTitle" as "cleanTitle",
               m."nativeTitle" as "nativeTitle",
               COALESCE(ca.episode_count_actual, m."totalEpisodes") as "totalEpisodes",
               (SELECT MAX("episodeNumber") FROM episodes e WHERE e."anilistId" = m."anilistId") as "latestEpisode"
        FROM collections c
        LEFT JOIN anime_metadata m ON REPLACE(c.anilist_id, 'manga|', '') = CAST(m."anilistId" AS VARCHAR)
        LEFT JOIN canonical_anime ca ON m."anilistId" = ca.anilist_id
        WHERE c."userId" = :user_id
        ORDER BY c."updatedAt" DESC
    \"\"\""""
content = content.replace("""    query = \"\"\"
        SELECT c.*,
               m."coverImage" as "coverImage",
               m."cleanTitle" as "cleanTitle",
               m."nativeTitle" as "nativeTitle",
               COALESCE(ca.episode_count_actual, m."totalEpisodes") as "totalEpisodes",
               (SELECT MAX("episodeNumber") FROM episodes e WHERE e."anilistId" = m."anilistId") as "latestEpisode"
        FROM collections c
        LEFT JOIN anime_metadata m ON c.anilist_id = CAST(m."anilistId" AS VARCHAR)
        LEFT JOIN canonical_anime ca ON m."anilistId" = ca.anilist_id
        WHERE c."userId" = :user_id
        ORDER BY c."updatedAt" DESC
    \"\"\"""", query_replace)

# Replace save_collection
post_replace = """@router.post("")
async def save_collection(coll: CollectionUpdate):
    from db.models import anime_metadata
    if coll.title and coll.img and str(coll.anilistId).isdigit():
        meta_stmt = (
            pg_insert(anime_metadata)
            .values(
                anilistId=int(coll.anilistId),
                cleanTitle=coll.title,
                coverImage=coll.img,
                updatedAt=func.now(),
            )
            .on_conflict_do_update(
                index_elements=["anilistId"],
                set_={
                    "cleanTitle": coll.title,
                    "coverImage": coll.img,
                    "updatedAt": func.now(),
                },
            )
        )
        await database.execute(meta_stmt)

    db_anilist_id = f"manga|{coll.anilistId}" if coll.mediaType == "manga" and not str(coll.anilistId).startswith("manga|") else str(coll.anilistId)

    stmt = (
        pg_insert(collections)
        .values(
            userId=coll.user_id,
            anilist_id=db_anilist_id,"""

content = content.replace("""@router.post("")
async def save_collection(coll: CollectionUpdate):
    from db.models import anime_metadata
    if coll.title and coll.img and coll.anilistId.isdigit():
        meta_stmt = (
            pg_insert(anime_metadata)
            .values(
                anilistId=int(coll.anilistId),
                cleanTitle=coll.title,
                coverImage=coll.img,
                updatedAt=func.now(),
            )
            .on_conflict_do_update(
                index_elements=["anilistId"],
                set_={
                    "cleanTitle": coll.title,
                    "coverImage": coll.img,
                    "updatedAt": func.now(),
                },
            )
        )
        await database.execute(meta_stmt)

    stmt = (
        pg_insert(collections)
        .values(
            userId=coll.user_id,
            anilist_id=coll.anilistId,""", post_replace)

with open("apps/api/routes/collection.py", "w") as f:
    f.write(content)
