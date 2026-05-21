from db.connection import database
from db.models import anime_metadata
from sqlalchemy.dialects.postgresql import insert as pg_insert

async def upsert_manga_metadata(manga_data: dict):
    stmt = pg_insert(anime_metadata).values(
        anilistId=int(manga_data["anilistId"]),
        cleanTitle=manga_data.get("cleanTitle", "Unknown"),
        nativeTitle=manga_data.get("nativeTitle"),
        coverImage=manga_data.get("img"),
        bannerImage=manga_data.get("banner"),
        synopsis=manga_data.get("synopsis"),
        score=manga_data.get("score"),
        status=manga_data.get("status"),
        totalEpisodes=manga_data.get("totalEps"),
        genres=manga_data.get("genres"),
        popularity=manga_data.get("popularity", 0),
        trending=manga_data.get("trending", 0)
    ).on_conflict_do_update(
        index_elements=["anilistId"],
        set_={
            "cleanTitle": manga_data.get("cleanTitle", "Unknown"),
            "nativeTitle": manga_data.get("nativeTitle"),
            "coverImage": manga_data.get("img"),
            "bannerImage": manga_data.get("banner"),
            "synopsis": manga_data.get("synopsis"),
            "score": manga_data.get("score"),
            "status": manga_data.get("status"),
            "totalEpisodes": manga_data.get("totalEps"),
            "genres": manga_data.get("genres"),
            "popularity": manga_data.get("popularity", 0),
            "trending": manga_data.get("trending", 0),
            "updatedAt": "now()"
        }
    )
    await database.execute(stmt)
