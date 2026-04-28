from fastapi import APIRouter, Response
from db.connection import database
import json
from datetime import datetime, timezone, timedelta

router = APIRouter()

@router.get("/v2/schedule")
async def get_schedule(response: Response):
    response.headers["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=86400"
    
    query = '''
        SELECT m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage", m."score", m."nextAiringEpisode", m.popularity,
               (SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'score_local') as local_score,
               (SELECT MAX("episodeNumber") FROM episodes e WHERE e."anilistId" = m."anilistId") as "latestEpisode",
               COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'views_local'), 0) + COALESCE((SELECT SUM(views) FROM daily_anime_stats d WHERE d."anilistId" = m."anilistId"), 0) as local_views
        FROM anime_metadata m
        LEFT JOIN canonical_anime c ON m."anilistId" = c.anilist_id
        WHERE m.status = 'RELEASING' AND m."nextAiringEpisode" IS NOT NULL
        ORDER BY local_views DESC, m.popularity DESC NULLS LAST
    '''
    
    try:
        rows = await database.fetch_all(query)
        schedule = {
            "Senin": [], "Selasa": [], "Rabu": [], "Kamis": [], 
            "Jumat": [], "Sabtu": [], "Minggu": [], "TBA": []
        }
        
        days_map = {
            0: "Senin", 1: "Selasa", 2: "Rabu", 3: "Kamis",
            4: "Jumat", 5: "Sabtu", 6: "Minggu"
        }
        
        wib = timezone(timedelta(hours=7))
        
        for row in rows:
            d = dict(row)
            try:
                next_air = json.loads(d["nextAiringEpisode"]) if isinstance(d["nextAiringEpisode"], str) else d["nextAiringEpisode"]
                airing_at = next_air.get("airingAt")
                if airing_at:
                    dt = datetime.fromtimestamp(airing_at, tz=timezone.utc).astimezone(wib)
                    day_name = days_map[dt.weekday()]
                    time_str = dt.strftime("%H:%M WIB")
                else:
                    day_name = "TBA"
                    time_str = ""
            except Exception:
                day_name = "TBA"
                time_str = ""
                
            final_score = d.get("score")
            if d.get("local_score") is not None:
                val = float(d["local_score"])
                final_score = int(val * 10) if val <= 10 else int(val)
                
            pop_v = d.get("popularity") or 100
            base_v = int(pop_v * 12 * 0.7)
            final_views = int(d.get("local_views", 0)) + base_v
            
            anime_obj = {
                "id": str(d["anilistId"]),
                "title": d.get("cleanTitle") or d.get("nativeTitle"),
                "img": d.get("coverImage"),
                "score": final_score,
                "views": final_views,
                "latestEpisode": d.get("latestEpisode"),
                "airingTime": time_str
            }
            
            schedule[day_name].append(anime_obj)
            
        filtered_schedule = {k: v for k, v in schedule.items() if len(v) > 0}
        
        return {"success": True, "data": filtered_schedule}
        
    except Exception as e:
        return {"success": False, "error": str(e)}
