import sys

with open("apps/api/routes/collection.py", "r") as f:
    content = f.read()

replacement = """@router.post("")
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

    stmt = ("""

content = content.replace("""@router.post("")
async def save_collection(coll: CollectionUpdate):
    stmt = (""", replacement)

with open("apps/api/routes/collection.py", "w") as f:
    f.write(content)
