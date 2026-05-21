import sys

with open("apps/api/routes/social.py", "r") as f:
    content = f.read()

replacement = """@router.post("/progress")
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
    stmt = ("""

content = content.replace("""@router.post("/progress")
async def update_watch_history(item: WatchProgressUpdate):
    # Drizzle schema columns: userId, anilist_id, episode, timestampSec, durationSec, completed
    stmt = (""", replacement)

with open("apps/api/routes/social.py", "w") as f:
    f.write(content)
