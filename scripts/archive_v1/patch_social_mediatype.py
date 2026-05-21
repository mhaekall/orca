import sys

with open("apps/api/routes/social.py", "r") as f:
    content = f.read()

# Replace get_watch_history query
query_replace = """    query = (
        select(
            watch_history,
            anime_metadata.c.cleanTitle,
            anime_metadata.c.nativeTitle,
            anime_metadata.c.coverImage,
        )
        .select_from(
            watch_history.outerjoin(
                anime_metadata,
                func.replace(watch_history.c.anilist_id, 'manga|', '') == func.cast(anime_metadata.c.anilistId, String),
            )
        )"""
content = content.replace("""    query = (
        select(
            watch_history,
            anime_metadata.c.cleanTitle,
            anime_metadata.c.nativeTitle,
            anime_metadata.c.coverImage,
        )
        .select_from(
            watch_history.outerjoin(
                anime_metadata,
                watch_history.c.anilist_id == func.cast(anime_metadata.c.anilistId, String),
            )
        )""", query_replace)

# Replace update_watch_history logic
post_replace = """@router.post("/progress")
async def update_watch_history(item: WatchProgressUpdate):
    # If title and coverImage are provided (e.g. for Manga), upsert into anime_metadata
    if item.title and item.coverImage and str(item.anilistId).isdigit():
        meta_stmt = (
            pg_insert(anime_metadata)
            .values(
                anilistId=int(item.anilistId),
                cleanTitle=item.title,
                coverImage=item.coverImage,
                updatedAt=func.now(),
            )
            .on_conflict_do_update(
                index_elements=["anilistId"],
                set_={
                    "cleanTitle": item.title,
                    "coverImage": item.coverImage,
                    "updatedAt": func.now(),
                },
            )
        )
        await database.execute(meta_stmt)

    # Drizzle schema columns: userId, anilist_id, episode, timestampSec, durationSec, completed
    db_anilist_id = f"manga|{item.anilistId}" if item.mediaType == "manga" and not str(item.anilistId).startswith("manga|") else str(item.anilistId)
    
    stmt = (
        pg_insert(watch_history)
        .values(
            userId=item.user_id,
            anilist_id=db_anilist_id,"""

content = content.replace("""@router.post("/progress")
async def update_watch_history(item: WatchProgressUpdate):
    # If title and coverImage are provided (e.g. for Manga), upsert into anime_metadata
    if item.title and item.coverImage and item.anilistId.isdigit():
        meta_stmt = (
            pg_insert(anime_metadata)
            .values(
                anilistId=int(item.anilistId),
                cleanTitle=item.title,
                coverImage=item.coverImage,
                updatedAt=func.now(),
            )
            .on_conflict_do_update(
                index_elements=["anilistId"],
                set_={
                    "cleanTitle": item.title,
                    "coverImage": item.coverImage,
                    "updatedAt": func.now(),
                },
            )
        )
        await database.execute(meta_stmt)

    # Drizzle schema columns: userId, anilist_id, episode, timestampSec, durationSec, completed
    stmt = (
        pg_insert(watch_history)
        .values(
            userId=item.user_id,
            anilist_id=str(item.anilistId),""", post_replace)

with open("apps/api/routes/social.py", "w") as f:
    f.write(content)
