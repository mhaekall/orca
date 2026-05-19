import os
from fastapi import APIRouter, Response, Query, HTTPException
from services.anilist import fetch_anilist_manga_home, fetch_anilist_manga_by_id, search_anilist_manga

router = APIRouter()

@router.get("/manga/home")
async def get_manga_home(response: Response):
    response.headers["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=86400"
    data = await fetch_anilist_manga_home()
    if not data:
        raise HTTPException(status_code=500, detail="Failed to fetch manga home from AniList")
    return {"success": True, "data": data}

@router.get("/manga/search")
async def search_manga(
    response: Response,
    q: str = Query(None, description="Search query"),
    page: int = Query(1, ge=1),
    limit: int = Query(24, le=50),
    sort: str = Query("POPULARITY_DESC", description="AniList sort enum")
):
    response.headers["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=86400"
    # Map frontend sort params to Anilist sort
    sort_map = {
        "score": "SCORE_DESC",
        "popularity": "POPULARITY_DESC",
        "trending": "TRENDING_DESC",
        "newest": "UPDATED_AT_DESC",
        "a-z": "TITLE_ROMAJI",
        "z-a": "TITLE_ROMAJI_DESC"
    }
    actual_sort = sort_map.get(sort, "POPULARITY_DESC") if sort in sort_map else sort
    
    data = await search_anilist_manga(q, page, limit, actual_sort)
    return {"success": True, "page": page, "data": data}

@router.get("/manga/{anilist_id}")
async def get_manga_detail(anilist_id: int, response: Response):
    response.headers["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=86400"
    data = await fetch_anilist_manga_by_id(anilist_id)
    if not data:
        raise HTTPException(status_code=404, detail="Manga not found")
        
    # Auto-translate synopsis to Indonesian if applicable
    if data.get("synopsis"):
        try:
            from utils.translator import translate_en_to_id
            if "dan" not in data["synopsis"].lower() and "yang" not in data["synopsis"].lower():
                translated = await translate_en_to_id(data["synopsis"])
                if translated and translated != data["synopsis"]:
                    data["synopsis"] = translated
        except Exception as e:
            pass

    return {"success": True, "data": data}
