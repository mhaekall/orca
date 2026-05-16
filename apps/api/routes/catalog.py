"""
catalog.py — Clean v2 API that uses anilistId as the universal primary key.

Why v2?
  The v1 API (/api/scrape, /api/multi-source, etc.) mixed oploverz slugs with
  AniList IDs and scraped on-demand.  v2 always uses anilistId, reads structured
  data from the DB, and only hits provider sites when the cache is cold.

Endpoints
─────────
GET  /api/v2/anime/{anilist_id}
     Full anime detail + episode list.  Triggers a background sync if the
     episode list is empty so the next request will be fast.

GET  /api/v2/anime/{anilist_id}/episodes/{ep_num}/stream
     Returns playable video sources for a specific episode.
     Uses video_cache; re-scrapes only when cache is stale (> 6 hours).

POST /api/v2/anime/{anilist_id}/sync
     Manually trigger an episode sync.  Useful after a new season drops.

GET  /api/v2/search?q=...
     Search AniList and enrich with our DB mapping data.

GET  /api/v2/anime/{anilist_id}/episodes
     Just the episode list (lighter response for the episode-list component).
"""

import asyncio
import os
import urllib.parse

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    Header,
    HTTPException,
    Query,
    Request,
    Response,
)

from db.connection import database
from services.anilist import fetch_anilist_info, fetch_anilist_info_by_id
from services.cache import swr_cache_get
from services.db import upsert_anime_db
from services.pipeline import (
    ensure_episodes_exist,
    get_anime_detail,
    get_episode_stream,
    get_provider_mappings,
    sync_anime_episodes,
)

router = APIRouter()


async def verify_admin_key(x_admin_key: str = Header(None)):
    expected_key = os.getenv("ADMIN_API_KEY")
    if not expected_key:
        return
    if not x_admin_key or x_admin_key != expected_key:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid Admin Key")


@router.get("/v2/debug/kuronime")
async def debug_kuronime(url: str = Query(...)):
    from services.pipeline import resolve_episode_sources

    try:
        result = await resolve_episode_sources(url, "kuronime")
        return result
    except Exception as e:
        import traceback

        return {
            "error": str(e),
            "trace": "Internal Server Error" if not os.getenv("DEBUG") else traceback.format_exc(),
        }


# ── GET /api/v2/anime/{anilist_id} ─────────────────────────────────────────────


@router.get("/v2/anime/{anilist_id}")
async def get_anime_v2(anilist_id: int, background_tasks: BackgroundTasks, response: Response):
    response.headers["Cache-Control"] = "public, max-age=10, stale-while-revalidate=60"
    try:
        """
        Full anime detail with episode list.
        """
        # Fetch from DB (fast path)
        data = await get_anime_detail(anilist_id)

        # Not in DB at all — try AniList
        if data is None:
            anilist_data = await _fetch_and_save_anilist(anilist_id)
            if not anilist_data:
                raise HTTPException(
                    status_code=404, detail=f"Anime {anilist_id} not found on AniList"
                )
            # Try DB again after saving
            data = await get_anime_detail(anilist_id)
            if data is None:
                raise HTTPException(
                    status_code=404, detail="Anime saved but could not be read back"
                )

        # Override nativeTitle with Romaji title directly from AniList
        # so frontend displays alphabet characters instead of Japanese Kanji
        try:
            live_anilist = await fetch_anilist_info_by_id(anilist_id)
            if live_anilist and live_anilist.get("romajiTitle"):
                data["nativeTitle"] = live_anilist["romajiTitle"]
        except:
            pass

        # Auto-translate synopsis to Indonesian and save to DB
        if data.get("synopsis"):
            try:
                from utils.translator import translate_en_to_id

                # Quick heuristic to avoid translating if it seems already translated
                if "dan" not in data["synopsis"].lower() and "yang" not in data["synopsis"].lower():
                    translated = await translate_en_to_id(data["synopsis"])
                    if translated and translated != data["synopsis"]:
                        data["synopsis"] = translated
                        background_tasks.add_task(
                            database.execute,
                            'UPDATE anime_metadata SET synopsis = :synopsis WHERE "anilistId" = :id',
                            values={"synopsis": translated, "id": anilist_id},
                        )
            except Exception as e:
                print(f"Translation error: {e}")

        # Episodes empty — sync in background so next request is fast
        if not data.get("episodes"):
            from services.queue import enqueue_sync

            await enqueue_sync(anilist_id)
            # Return metadata without episodes rather than a 404
            return {
                "success": True,
                "syncing": True,
                "message": "Episode list is being fetched. Please refresh in ~10 seconds.",
                "data": data,
            }

        return {"success": True, "data": data}
    except Exception as e:
        import traceback

        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "trace": "Internal Server Error" if not os.getenv("DEBUG") else traceback.format_exc(),
        }


# ── GET /api/v2/anime/{anilist_id}/episodes ────────────────────────────────────


@router.get("/v2/anime/{anilist_id}/episodes")
async def get_episodes_v2(anilist_id: int, background_tasks: BackgroundTasks, response: Response):
    response.headers["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=86400"
    """Lightweight endpoint: only the episode list."""
    has_eps = await ensure_episodes_exist(anilist_id)
    if not has_eps:
        # Kick off a sync via QStash task queue to distribute bots
        from services.queue import enqueue_sync

        await enqueue_sync(anilist_id)
        return {"success": False, "syncing": True, "data": []}

    rows = await database.fetch_all(
        """
        SELECT DISTINCT ON ("episodeNumber")
               "episodeNumber", "episodeTitle", "episodeUrl", "providerId", "thumbnailUrl", "updatedAt"
        FROM   episodes
        WHERE  "anilistId" = :id
        ORDER  BY "episodeNumber" DESC,
               CASE "providerId" 
                 WHEN 'otakudesu' THEN 1 
                 WHEN 'samehadaku' THEN 2 
                 WHEN 'doronime' THEN 3 
                 WHEN 'oploverz' THEN 4 
                 ELSE 99 
               END
        """,
        values={"id": anilist_id},
    )
    return {"success": True, "data": [dict(r) for r in rows]}


# ── ADMIN ENDPOINTS ────────────────────────────────────────────────────────────


@router.get("/v2/admin/stats", dependencies=[Depends(verify_admin_key)])
async def admin_get_stats():
    """Get ingestion and database stats for the admin dashboard"""
    from services.prefetch import get_ingestion_stats

    stats = await get_ingestion_stats()
    return {"success": True, **stats}


@router.get("/v2/admin/analytics", dependencies=[Depends(verify_admin_key)])
async def admin_get_analytics():
    """Get real user engagement data (unmanipulated) for the admin dashboard"""
    try:
        real_views = await database.fetch_val("SELECT COUNT(*) FROM watch_sessions") or 0
        real_likes = await database.fetch_val("SELECT COUNT(*) FROM episode_likes") or 0
        real_comments = await database.fetch_val("SELECT COUNT(*) FROM comments") or 0

        # Real Users: Count distinct users from watch_history or watch_sessions
        real_users = (
            await database.fetch_val("SELECT COUNT(DISTINCT user_id) FROM watch_sessions") or 0
        )

        # Top 5 Real Watched Anime
        top_real_anime = await database.fetch_all("""
            SELECT a."cleanTitle" as title, a."anilistId", COUNT(w.session_id) as real_views
            FROM watch_sessions w
            JOIN anime_metadata a ON w.anilist_id = a."anilistId"
            GROUP BY a."anilistId", a."cleanTitle"
            ORDER BY real_views DESC
            LIMIT 5
        """)

        return {
            "success": True,
            "real_views": real_views,
            "real_likes": real_likes,
            "real_comments": real_comments,
            "real_users": real_users,
            "top_real_anime": [dict(r) for r in top_real_anime],
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/v2/admin/trigger-prefetch", dependencies=[Depends(verify_admin_key)])
async def admin_trigger_prefetch():
    """Manually trigger the smart pre-fetch job instead of waiting for cron"""
    # Import here to avoid circular imports if any
    import asyncio

    from services.prefetch import smart_prefetch_episodes

    # We trigger it in the background so the request doesn't timeout
    asyncio.create_task(smart_prefetch_episodes(force=True))

    return {"success": True, "message": "Smart Pre-fetch job started in the background."}


@router.get("/v2/admin/database", dependencies=[Depends(verify_admin_key)])
async def admin_get_database(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: str = Query(None),
    hide_empty: bool = Query(False),
    only_tg: bool = Query(False),
    provider: str = Query(None),
):
    """Return paginated anime in database with episode counts"""
    try:
        offset = (page - 1) * limit
        where_clause = "1=1"
        having_clause = "1=1"
        values = {}

        if search:
            if search.isdigit():
                where_clause += ' AND a."anilistId" = :search_id'
                values["search_id"] = int(search)
            else:
                where_clause += ' AND a."cleanTitle" ILIKE :search_str'
                values["search_str"] = f"%{search}%"

        if hide_empty:
            having_clause += " AND COUNT(e.id) > 0"

        if only_tg:
            having_clause += " AND SUM(CASE WHEN e.\"episodeUrl\" LIKE '%tg-proxy%' OR e.\"episodeUrl\" LIKE '%workers.dev%' THEN 1 ELSE 0 END) > 0"

        if provider:
            having_clause += ' AND MAX(e."providerId") = :provider'
            values["provider"] = provider

        # Note: Using subqueries or CTEs for accurate counts with HAVING is safer, but for simplicity we'll count from the grouped result
        count_query = f"""
            SELECT COUNT(*) FROM (
                SELECT a."anilistId"
                FROM anime_metadata a
                LEFT JOIN episodes e ON a."anilistId" = e."anilistId"
                WHERE {where_clause}
                GROUP BY a."anilistId"
                HAVING {having_clause}
            ) as subq
        """
        total_count = await database.fetch_val(count_query, values)

        query = f"""
            SELECT a."anilistId", a."cleanTitle" as title, a.genres, a.status, a.year, a."coverImage" as cover,
                   COUNT(e.id) as episode_count,
                   SUM(CASE WHEN e."episodeUrl" LIKE '%tg-proxy%' OR e."episodeUrl" LIKE '%workers.dev%' THEN 1 ELSE 0 END) as tg_count,
                   MAX(e."providerId") as "providerId"
            FROM anime_metadata a
            LEFT JOIN episodes e ON a."anilistId" = e."anilistId"
            WHERE {where_clause}
            GROUP BY a."anilistId", a."cleanTitle", a.genres, a.status, a.year, a."coverImage"
            HAVING {having_clause}
            ORDER BY a.year DESC, a."cleanTitle" ASC
            LIMIT :limit OFFSET :offset
        """

        values["limit"] = limit
        values["offset"] = offset

        rows = await database.fetch_all(query, values)
        data = [dict(row) for row in rows]

        total_pages = (total_count + limit - 1) // limit if total_count else 1

        return {
            "success": True,
            "data": data,
            "pagination": {
                "total": total_count,
                "page": page,
                "limit": limit,
                "total_pages": total_pages,
            },
        }
    except Exception as e:
        import traceback

        traceback.print_exc()
        return {"success": False, "error": str(e)}


@router.get("/v2/admin/swarm-health", dependencies=[Depends(verify_admin_key)])
async def admin_swarm_health(filter: str = Query("all", pattern="^(all|healthy|error)$")):
    """
    Fetch all TG Swarm links and diagnose them concurrently.
    Backend does all the heavy lifting so frontend remains completely dumb.
    """
    try:
        where_clause = "(\"episodeUrl\" LIKE '%tg-proxy%' OR \"episodeUrl\" LIKE '%workers.dev%')"
        query = f"""
            SELECT e.id, e."anilistId", a."cleanTitle" as title, e."episodeNumber", e."episodeUrl"
            FROM episodes e
            LEFT JOIN anime_metadata a ON e."anilistId" = a."anilistId"
            WHERE {where_clause}
            ORDER BY e."updatedAt" DESC
        """
        rows = await database.fetch_all(query)
        items = [dict(r) for r in rows]

        import asyncio

        import httpx

        limits = httpx.Limits(max_connections=100, max_keepalive_connections=20)
        sem = asyncio.Semaphore(100)

        async def diagnose(item, client):
            async with sem:
                url = item["episodeUrl"]
                result = item.copy()
                try:
                    resp = await client.get(url, timeout=7.0)
                    if resp.status_code == 200 and "#EXTM3U" in resp.text:
                        result["healthy"] = True
                        result["status"] = "Healthy"
                    else:
                        result["healthy"] = False
                        result["status"] = f"HTTP {resp.status_code}" if resp.status_code != 200 else "Invalid M3U8"
                except Exception:
                    result["healthy"] = False
                    result["status"] = "Unreachable"

                return result

        async with httpx.AsyncClient(limits=limits, timeout=10.0, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}) as client:
            tasks = [diagnose(item, client) for item in items]
            results = await asyncio.gather(*tasks)

        # Apply filter
        if filter == "healthy":
            results = [r for r in results if r["healthy"]]
        elif filter == "error":
            results = [r for r in results if not r["healthy"]]

        return {"success": True, "data": results}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

@router.get("/v2/admin/swarm-vault", dependencies=[Depends(verify_admin_key)])
async def admin_get_swarm_vault(
    page: int = Query(1, ge=1), limit: int = Query(100, ge=1, le=500), search: str = Query(None)
):
    """Return paginated list of all Telegram Proxy URLs (The Vault) for backup/restore purposes."""
    try:
        offset = (page - 1) * limit
        where_clause = "1=1"
        values = {}

        if search:
            where_clause += ' AND (title ILIKE :search_str OR CAST("anilistId" AS TEXT) ILIKE :search_str)'
            values["search_str"] = f"%{search}%"

        count_query = f"""
            SELECT COUNT(id)
            FROM swarm_vault
            WHERE {where_clause}
        """
        total_count = await database.fetch_val(count_query, values)

        query = f"""
            SELECT id, "anilistId", title, "episodeNumber", "providerId", "episodeUrl", "updatedAt"
            FROM swarm_vault
            WHERE {where_clause}
            ORDER BY "updatedAt" DESC
            LIMIT :limit OFFSET :offset
        """

        values["limit"] = limit
        values["offset"] = offset

        rows = await database.fetch_all(query, values)
        data = [dict(row) for row in rows]

        for r in data:
            if r.get("updatedAt"):
                r["updatedAt"] = r["updatedAt"].isoformat()

        total_pages = (total_count + limit - 1) // limit if total_count else 1

        return {
            "success": True,
            "data": data,
            "pagination": {
                "total": total_count,
                "page": page,
                "limit": limit,
                "total_pages": total_pages,
            },
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

from pydantic import BaseModel

@router.get("/v2/admin/swarm-vault/anime", dependencies=[Depends(verify_admin_key)])
async def admin_get_swarm_vault_anime(
    page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=100), search: str = Query(None)
):
    """Return paginated list of anime that have episodes in the Swarm Vault."""
    try:
        offset = (page - 1) * limit
        where_clause = "1=1"
        values = {}

        if search:
            where_clause += ' AND (v.title ILIKE :search_str OR CAST(v."anilistId" AS TEXT) ILIKE :search_str)'
            values["search_str"] = f"%{search}%"

        count_query = f"""
            SELECT COUNT(DISTINCT v."anilistId")
            FROM swarm_vault v
            WHERE {where_clause}
        """
        total_count = await database.fetch_val(count_query, values)

        query = f"""
            SELECT 
                v."anilistId", 
                MAX(v.title) as title,
                COUNT(v.id) as episode_count,
                MAX(a."coverImage") as cover,
                MAX(a.status) as status,
                MAX(a.year) as year,
                COUNT(v.id) as tg_count
            FROM swarm_vault v
            LEFT JOIN anime_metadata a ON v."anilistId" = a."anilistId"
            WHERE {where_clause}
            GROUP BY v."anilistId"
            ORDER BY MAX(v."updatedAt") DESC
            LIMIT :limit OFFSET :offset
        """

        values["limit"] = limit
        values["offset"] = offset

        rows = await database.fetch_all(query, values)
        data = [dict(row) for row in rows]
        
        # Get overall stats for Vault
        stats_query = "SELECT COUNT(id) as total_episodes FROM swarm_vault"
        stats_res = await database.fetch_one(stats_query)

        total_pages = (total_count + limit - 1) // limit if total_count else 1

        return {
            "success": True,
            "data": data,
            "stats": {
                "total_episodes": stats_res["total_episodes"] if stats_res else 0,
                "tg_episodes": stats_res["total_episodes"] if stats_res else 0,
            },
            "pagination": {
                "total": total_count,
                "page": page,
                "limit": limit,
                "total_pages": total_pages,
            },
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

@router.get("/v2/admin/swarm-vault/anime/{anilist_id}/episodes", dependencies=[Depends(verify_admin_key)])
async def admin_get_swarm_vault_episodes(anilist_id: int):
    """Get all vault episodes for a specific anime."""
    try:
        query = """
            SELECT id, "episodeNumber", "providerId", "episodeUrl", "updatedAt"
            FROM swarm_vault
            WHERE "anilistId" = :anilist_id
            ORDER BY "episodeNumber" DESC
        """
        rows = await database.fetch_all(query, {"anilist_id": anilist_id})
        data = [dict(r) for r in rows]
        for r in data:
            if r.get("updatedAt"):
                r["updatedAt"] = r["updatedAt"].isoformat()
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/v2/admin/swarm-vault/sync-all", dependencies=[Depends(verify_admin_key)])
async def admin_sync_all_swarm_vault():
    """Fetch ALL tele-proxy episodes from the main DB and sync them to the vault."""
    try:
        query = """
            INSERT INTO swarm_vault ("anilistId", title, "episodeNumber", "providerId", "episodeUrl")
            SELECT DISTINCT ON (e."episodeUrl")
                   e."anilistId", a."cleanTitle", e."episodeNumber", e."providerId", e."episodeUrl"
            FROM episodes e
            LEFT JOIN anime_metadata a ON e."anilistId" = a."anilistId"
            WHERE (e."episodeUrl" LIKE '%tg-proxy%' OR e."episodeUrl" LIKE '%workers.dev%')
            ON CONFLICT ("episodeUrl") DO UPDATE 
            SET "anilistId" = EXCLUDED."anilistId", title = EXCLUDED.title, 
                "episodeNumber" = EXCLUDED."episodeNumber", "providerId" = EXCLUDED."providerId", 
                "updatedAt" = now();
        """
        await database.execute(query)
        return {"success": True, "message": "Successfully synchronized all Telegram links to the Vault."}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

class SwarmVaultCreate(BaseModel):
    anilistId: int
    title: str = None
    episodeNumber: float
    providerId: str
    episodeUrl: str

class SyncVaultRequest(BaseModel):
    anilistId: int
    episodeNumber: float

@router.post("/v2/admin/swarm-vault/sync", dependencies=[Depends(verify_admin_key)])
async def admin_sync_swarm_vault(payload: SyncVaultRequest):
    """Fetch an episode from the main DB and add it to the vault."""
    try:
        query = """
            SELECT e."anilistId", a."cleanTitle" as title, e."episodeNumber", e."providerId", e."episodeUrl"
            FROM episodes e
            LEFT JOIN anime_metadata a ON e."anilistId" = a."anilistId"
            WHERE e."anilistId" = :anilistId AND e."episodeNumber" = :episodeNumber
              AND (e."episodeUrl" LIKE '%tg-proxy%' OR e."episodeUrl" LIKE '%workers.dev%')
            LIMIT 1
        """
        row = await database.fetch_one(query, {"anilistId": payload.anilistId, "episodeNumber": payload.episodeNumber})
        if not row:
            return {"success": False, "error": "No TG proxy episode found in database for this ID and Episode."}
        
        insert_query = """
            INSERT INTO swarm_vault ("anilistId", title, "episodeNumber", "providerId", "episodeUrl")
            VALUES (:anilistId, :title, :episodeNumber, :providerId, :episodeUrl)
            ON CONFLICT ("episodeUrl") DO UPDATE 
            SET "anilistId" = EXCLUDED."anilistId", title = EXCLUDED.title, 
                "episodeNumber" = EXCLUDED."episodeNumber", "providerId" = EXCLUDED."providerId", 
                "updatedAt" = now()
            RETURNING id
        """
        values = dict(row)
        new_id = await database.execute(insert_query, values)
        return {"success": True, "id": new_id, "message": f"Successfully synced EP {payload.episodeNumber} to vault."}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/v2/admin/swarm-vault", dependencies=[Depends(verify_admin_key)])
async def admin_create_swarm_vault(payload: SwarmVaultCreate):
    """Manually add a backup link to the swarm vault."""
    try:
        query = """
            INSERT INTO swarm_vault ("anilistId", title, "episodeNumber", "providerId", "episodeUrl")
            VALUES (:anilistId, :title, :episodeNumber, :providerId, :episodeUrl)
            RETURNING id
        """
        values = payload.dict()
        new_id = await database.execute(query, values)
        return {"success": True, "id": new_id, "message": "Vault entry created successfully."}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.put("/v2/admin/swarm-vault/{vault_id}", dependencies=[Depends(verify_admin_key)])
async def admin_update_swarm_vault(vault_id: int, payload: SwarmVaultCreate):
    """Update a vault entry."""
    try:
        query = """
            UPDATE swarm_vault 
            SET "anilistId" = :anilistId, title = :title, "episodeNumber" = :episodeNumber, 
                "providerId" = :providerId, "episodeUrl" = :episodeUrl, "updatedAt" = now()
            WHERE id = :id
        """
        values = payload.dict()
        values["id"] = vault_id
        await database.execute(query, values)
        return {"success": True, "message": "Vault entry updated successfully."}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.delete("/v2/admin/swarm-vault/{vault_id}", dependencies=[Depends(verify_admin_key)])
async def admin_delete_swarm_vault(vault_id: int):
    """Delete a vault entry."""
    try:
        query = "DELETE FROM swarm_vault WHERE id = :id"
        await database.execute(query, {"id": vault_id})
        return {"success": True, "message": "Vault entry deleted successfully."}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/v2/admin/swarm-vault/export", dependencies=[Depends(verify_admin_key)])
async def admin_export_swarm_vault():
    """Export all Telegram Proxy URLs to CSV format."""
    try:
        query = f"""
            SELECT id, "anilistId", title, "episodeNumber", "providerId", "episodeUrl", "updatedAt"
            FROM swarm_vault
            ORDER BY "updatedAt" DESC
        """

        rows = await database.fetch_all(query)

        import csv
        import io

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            ["id", "anilistId", "title", "episodeNumber", "providerId", "episodeUrl", "updatedAt"]
        )

        for r in rows:
            writer.writerow(
                [
                    r["id"],
                    r["anilistId"],
                    r["title"] or "Unknown",
                    r["episodeNumber"],
                    r["providerId"],
                    r["episodeUrl"],
                    r["updatedAt"].isoformat() if r["updatedAt"] else "",
                ]
            )

        from fastapi.responses import StreamingResponse

        response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
        response.headers["Content-Disposition"] = "attachment; filename=swarm_vault_backup.csv"
        return response
    except Exception as e:
        import traceback

        traceback.print_exc()
        return {"success": False, "error": str(e)}


@router.post("/v2/admin/swarm-vault/export-tg", dependencies=[Depends(verify_admin_key)])
async def admin_export_swarm_vault_tg():
    """Export all Telegram Proxy URLs to CSV and send directly to @myorca5_bot."""
    try:
        query = f"""
            SELECT id, "anilistId", title, "episodeNumber", "providerId", "episodeUrl", "updatedAt"
            FROM swarm_vault
            ORDER BY "updatedAt" DESC
        """
        rows = await database.fetch_all(query)

        import csv
        import io

        import httpx

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            ["id", "anilistId", "title", "episodeNumber", "providerId", "episodeUrl", "updatedAt"]
        )
        for r in rows:
            writer.writerow(
                [
                    r["id"],
                    r["anilistId"],
                    r["title"] or "Unknown",
                    r["episodeNumber"],
                    r["providerId"],
                    r["episodeUrl"],
                    r["updatedAt"].isoformat() if r["updatedAt"] else "",
                ]
            )

        csv_content = output.getvalue().encode("utf-8")

        # Obfuscated token or fetched from env
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        chat_id = os.getenv("TELEGRAM_CHAT_ID")
        tg_url = f"https://api.telegram.org/bot{bot_token}/sendDocument"

        async with httpx.AsyncClient(timeout=30.0) as client:
            files = {"document": ("swarm_vault_backup.csv", csv_content, "text/csv")}
            data = {
                "chat_id": chat_id,
                "caption": f"📦 **Swarm Vault Backup**\nTotal Records: {len(rows)}\nAuto-generated by Orca Admin.",
            }
            resp = await client.post(tg_url, data=data, files=files)
            if not resp.is_success:
                raise Exception(f"Telegram API Error: {resp.text}")

        return {
            "success": True,
            "message": f"Successfully sent {len(rows)} records to @myorca5_bot",
        }
    except Exception as e:
        import traceback

        traceback.print_exc()
        return {"success": False, "error": str(e)}


@router.post("/v2/admin/mass-sync", dependencies=[Depends(verify_admin_key)])
async def admin_mass_sync():
    """Trigger a mass sync via QStash or local background task"""
    import os
    import subprocess
    import sys

    script_path = os.path.join(os.path.dirname(__file__), "../scripts/mass_sync.py")
    env = os.environ.copy()
    root_dir = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )
    env["PYTHONPATH"] = (
        f"{env.get('PYTHONPATH', '')}:{root_dir}:{os.path.join(root_dir, 'apps', 'api')}"
    )
    subprocess.Popen([sys.executable, script_path], env=env)
    return {"success": True, "message": "Mass sync process started in background."}


@router.post("/v2/admin/sync-missing", dependencies=[Depends(verify_admin_key)])
async def admin_sync_missing():
    """Find animes with 0 episodes and queue them for sync"""
    try:
        query = """
            SELECT a."anilistId"
            FROM anime_metadata a
            LEFT JOIN episodes e ON a."anilistId" = e."anilistId"
            GROUP BY a."anilistId"
            HAVING COUNT(e.id) = 0
        """
        rows = await database.fetch_all(query)
        count = 0
        for row in rows:
            await enqueue_sync(row["anilistId"])
            count += 1

        return {"success": True, "message": f"Queued {count} missing anime for syncing."}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/v2/debug/curl")
async def debug_curl(url: str):
    from utils.tls_spoof import TLSSpoofTransport

    try:
        html = await TLSSpoofTransport.get(url)
        return {"success": True, "html_len": len(html), "html_snippet": html[:500]}
    except Exception as e:
        import traceback

        return {
            "success": False,
            "error": str(e),
            "trace": "Internal Server Error" if not os.getenv("DEBUG") else traceback.format_exc(),
        }


@router.get("/v2/debug/stream")
async def debug_stream(anilist_id: int, title: str, ep: float):
    from routes.stream_v2 import _last_resort_otakudesu, _scrape_kuronime, _title_variants
    from services.anilist import fetch_anilist_info_by_id

    info = await fetch_anilist_info_by_id(anilist_id)
    variants = _title_variants(title, info)
    res_ota = await _last_resort_otakudesu(variants[0], ep)
    res_ota2 = await _last_resort_otakudesu(variants[1] if len(variants) > 1 else variants[0], ep)
    res_kur = await _scrape_kuronime(title, ep)
    return {
        "variants": variants,
        "otakudesu1": res_ota,
        "otakudesu2": res_ota2,
        "kuronime": res_kur,
    }


@router.post("/v2/admin/fix-titles", dependencies=[Depends(verify_admin_key)])
async def admin_fix_titles(background_tasks: BackgroundTasks):
    """Mass update nativeTitle to Romaji for all existing anime in the database"""

    async def _process_fix():
        try:
            from services.anilist import fetch_anilist_info_by_id

            rows = await database.fetch_all('SELECT "anilistId", "nativeTitle" FROM anime_metadata')
            count = 0
            for row in rows:
                aid = row["anilistId"]
                # Check if it contains non-ASCII characters (like Kanji/Kana)
                if any(ord(c) > 127 for c in row["nativeTitle"] or ""):
                    try:
                        info = await fetch_anilist_info_by_id(aid)
                        if info and info.get("romajiTitle"):
                            await database.execute(
                                'UPDATE anime_metadata SET "nativeTitle" = :romaji WHERE "anilistId" = :aid',
                                values={"romaji": info["romajiTitle"], "aid": aid},
                            )
                            count += 1
                    except Exception as e:
                        print(f"Error fixing {aid}: {e}")
                    await asyncio.sleep(0.35)  # Avoid hitting AniList rate limits
            print(f"Successfully fixed {count} Japanese titles to Romaji in DB.")
        except Exception as e:
            print(f"Fatal error in fix-titles: {e}")

    background_tasks.add_task(_process_fix)
    return {"success": True, "message": "Background job started to fix Japanese titles to Romaji."}


@router.get("/v2/anime/{anilist_id}/episodes/{ep_num}/stream")
async def get_episode_stream_v2(
    anilist_id: int, ep_num: str, response: Response, refresh: bool = Query(False)
):
    response.headers["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=86400"
    """
    Return resolved video sources for one episode.

    ep_num can be "1", "12", "12.5" (floats for OVAs / specials).
    Sources come from video_cache when fresh; re-scrapes when stale.
    Set refresh=true to skip DB cache and force a new scrape.
    """
    try:
        ep_float = float(ep_num)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid episode number: {ep_num}")

    if refresh:
        # Get mapping first
        from services.cache import upstash_del
        from services.pipeline import get_provider_mappings
        from services.stream_cache import CacheKey

        mappings = await get_provider_mappings(anilist_id)
        for pid, slug in mappings.items():
            # Clear cache for all providers of this anime to force re-scrape
            from services.pipeline import build_provider_series_url

            series_url = build_provider_series_url(pid, slug)
            rows = await database.fetch_all(
                'SELECT "episodeUrl" FROM episodes WHERE "anilistId" = :aid AND "providerId" = :pid',
                values={"aid": anilist_id, "pid": pid},
            )
            for row in rows:
                await upstash_del(CacheKey.stream(row["episodeUrl"]))
            await database.execute(
                'DELETE FROM video_cache WHERE "episodeUrl" LIKE :url_pattern',
                values={"url_pattern": f"%{slug}%"},
            )

    result = await get_episode_stream(anilist_id, ep_float)

    if result is None:
        # Episode not in DB — maybe not synced yet
        has_eps = await ensure_episodes_exist(anilist_id)
        if has_eps:
            result = await get_episode_stream(anilist_id, ep_float)

    if not result or not result.get("sources"):
        raise HTTPException(
            status_code=503,
            detail=f"No video sources available for episode {ep_num}. "
            "Sources may still be resolving — try again in a few seconds.",
        )

    return {"success": True, **result}


# ── POST /api/v2/anime/{anilist_id}/sync ───────────────────────────────────────


@router.post("/v2/anime/{anilist_id}/sync")
async def trigger_sync_v2(anilist_id: int, background_tasks: BackgroundTasks):
    """
    Manually trigger a full episode sync for an anime.
    Runs asynchronously — returns immediately.
    """
    background_tasks.add_task(sync_anime_episodes, anilist_id)
    return {
        "success": True,
        "message": f"Episode sync started for anilist_id={anilist_id}",
    }


@router.get("/v2/browse")
async def browse_anime(
    response: Response,
    page: int = Query(1, ge=1),
    sort: str = Query("score", pattern="^(score|popularity|trending|newest|a-z|z-a)$"),
    genre: str = Query(None),
    status: str = Query(None, pattern="^(RELEASING|FINISHED|NOT_YET_RELEASED)$"),
    limit: int = Query(24, le=50),
    q: str = Query(None, description="Search query"),
):
    response.headers["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=86400"
    """Browse full anime catalog from database, with filter and sorting."""
    conditions = ["1=1"]
    values = {"offset": (page - 1) * limit, "limit": limit}

    if q:
        conditions.append('meta."cleanTitle" ILIKE :q OR meta."nativeTitle" ILIKE :q')
        values["q"] = f"%{q}%"
    if genre:
        # Use simple ILIKE for JSONB array of strings or text representation
        conditions.append("meta.genres::text ILIKE :genre")
        values["genre"] = f"%{genre}%"
    if status:
        conditions.append("meta.status = :status")
        values["status"] = status

    sort_map = {
        "score": "meta.score DESC NULLS LAST",
        "popularity": "meta.popularity DESC NULLS LAST",
        "trending": "meta.trending DESC NULLS LAST",
        "newest": 'meta."seasonYear" DESC NULLS LAST',
        "a-z": 'meta."cleanTitle" ASC NULLS LAST',
        "z-a": 'meta."cleanTitle" DESC NULLS LAST',
    }

    where_clause = " AND ".join(conditions)
    order_clause = sort_map.get(sort, "meta.score DESC NULLS LAST")

    query = f"""
        SELECT meta.*, 
               COUNT(e."episodeNumber") as episode_count,
               COALESCE(c.episode_count_actual, meta."totalEpisodes") as "totalEpisodes",
               (SELECT MAX("episodeNumber") FROM episodes e2 WHERE e2."anilistId" = meta."anilistId") as "latestEpisode"
        FROM anime_metadata meta
        LEFT JOIN canonical_anime c ON meta."anilistId" = c.anilist_id
        INNER JOIN episodes e ON meta."anilistId" = e."anilistId"
        WHERE {where_clause}
        GROUP BY meta."anilistId", c.id
        ORDER BY {order_clause}
        LIMIT :limit OFFSET :offset
    """

    try:
        rows = await database.fetch_all(query, values=values)
        return {"success": True, "page": page, "data": [dict(r) for r in rows]}
    except Exception as e:
        print(f"[Catalog] Browse error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── GET /api/v2/search ─────────────────────────────────────────────────────────


@router.get("/v2/search")
async def search_v2(
    response: Response,
    q: str = Query(..., min_length=2, description="Search query"),
    background_tasks: BackgroundTasks = None,
):
    response.headers["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=86400"
    """
    Search AniList and return results enriched with local DB status.

    Each result includes:
      - hasMapping: whether we already have provider mappings for it
      - providers: which providers we know about
      - hasEpisodes: whether the episode list is populated
    """
    cache_key = f"search_v2:{q.lower().strip()}"

    async def do_search():
        result = await fetch_anilist_info(q)
        if not result:
            # Fallback to provider searches
            from services.pipeline import PROVIDERS

            tasks = []
            for name, provider in PROVIDERS.items():
                if hasattr(provider, "search") and callable(provider.search):

                    async def _safe_search(n, p, q):
                        try:
                            import asyncio

                            async with asyncio.timeout(10.0):
                                res = await p.search(q)
                                for item in res:
                                    item["source"] = n
                                return res
                        except Exception as e:
                            print(f"[{n}] Fallback search error: {e}")
                            return []

                    tasks.append(_safe_search(name, provider, q))

            if tasks:
                fallback_results = await asyncio.gather(*tasks)
                combined = []
                seen = set()
                for res_list in fallback_results:
                    for item in res_list:
                        title = item.get("title")
                        if title and title.lower() not in seen:
                            seen.add(title.lower())
                            # Format to match AniList structure as closely as possible
                            combined.append(
                                {
                                    "anilistId": 0,  # Fallback ID indicating no AniList link yet
                                    "title": title,
                                    "url": item.get("url"),
                                    "source": item.get("source", "unknown"),
                                    "hasMapping": True,  # Assume we can scrape it if we found it
                                    "hasEpisodes": False,
                                    "detailUrl": f"/anime/0?title={urllib.parse.quote_plus(title)}",
                                }
                            )
                if combined:
                    return combined
            return []

        anilist_id = result["anilistId"]
        mappings = await get_provider_mappings(anilist_id)

        count_row = await database.fetch_one(
            'SELECT COUNT(*) as cnt FROM episodes WHERE "anilistId" = :id',
            values={"id": anilist_id},
        )
        has_eps = count_row and count_row["cnt"] > 0

        # Save to DB in the background if new
        if not mappings and background_tasks:
            background_tasks.add_task(upsert_anime_db, result, "anilist_search", str(anilist_id))

        return [
            {
                **result,
                "hasMapping": len(mappings) > 0,
                "providers": list(mappings.keys()),
                "hasEpisodes": has_eps,
                # Canonical frontend route — always uses anilistId
                "detailUrl": f"/anime/{anilist_id}",
            }
        ]

    data = await swr_cache_get(cache_key, do_search, ttl=600, swr=3600)
    return {"success": True, "data": data or []}


# ── GET /api/v2/stats ──────────────────────────────────────────────────────────


@router.get("/v2/stats")
async def get_stats():
    """Return database statistics."""
    anime_count = await database.fetch_one("SELECT COUNT(*) as cnt FROM anime_metadata")
    episodes_count = await database.fetch_one("SELECT COUNT(*) as cnt FROM episodes")
    return {
        "success": True,
        "data": {
            "total_anime": anime_count["cnt"] if anime_count else 0,
            "total_episodes": episodes_count["cnt"] if episodes_count else 0,
        },
    }


# ── POST /api/v2/sync-latest ───────────────────────────────────────────────────


@router.post("/v2/sync-latest")
async def sync_latest(background_tasks: BackgroundTasks):
    """
    Scrape latest from providers, map them, and sync episodes immediately via background tasks.
    Returns how many new mappings were found.
    """
    from services.background import (
        scrape_doronime_home,
        scrape_oploverz_home,
        scrape_otakudesu_home,
        scrape_samehadaku_home,
    )
    from services.db import upsert_mapping_atomic

    results = await asyncio.gather(
        scrape_oploverz_home(),
        scrape_otakudesu_home(),
        scrape_samehadaku_home(),
        scrape_doronime_home(),
        return_exceptions=True,
    )

    all_items = []
    for res in results:
        if isinstance(res, list):
            all_items.extend(res)

    seen_titles = set()
    items = []
    for item in all_items:
        t = item["title"].lower()
        if t not in seen_titles:
            seen_titles.add(t)
            items.append(item)

    processed_count = 0
    for item in items[:40]:  # limit to 40 to avoid timeouts
        try:
            anilist_data = await fetch_anilist_info(item["title"])
            if anilist_data:
                await upsert_anime_db(anilist_data, "anilist_sync", str(anilist_data["anilistId"]))
                await upsert_mapping_atomic(
                    anilist_id=anilist_data["anilistId"],
                    provider_id=item["provider_id"],
                    provider_slug=item["provider_slug"],
                    clean_title=anilist_data.get("cleanTitle")
                    or anilist_data.get("nativeTitle", ""),
                    cover_image=anilist_data.get("hdImage") or anilist_data.get("coverImage", ""),
                )
                # Use background_tasks to bypass QStash
                background_tasks.add_task(sync_anime_episodes, anilist_data["anilistId"])
                processed_count += 1
        except Exception as e:
            print(f"[SyncLatest] Error processing {item['title']}: {e}")

    return {
        "success": True,
        "message": f"Successfully mapped {processed_count} latest anime and started episode sync in background.",
    }


# ── GET /api/v2/anime/{anilist_id}/mappings ────────────────────────────────────


@router.get("/v2/anime/{anilist_id}/mappings")
async def get_mappings_v2(anilist_id: int):
    """Debug endpoint: show all provider mappings for an anime."""
    mappings = await get_provider_mappings(anilist_id)
    return {"success": True, "anilistId": anilist_id, "mappings": mappings}


# ── internal helpers ───────────────────────────────────────────────────────────


async def _fetch_and_save_anilist(anilist_id: int) -> dict | None:
    """
    Fetch a specific anime by its AniList ID (not by title).
    We query AniList with the numeric ID rather than doing a title search.
    """
    from services.clients import client

    QUERY = """
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english native }
        coverImage { extraLarge large color }
        bannerImage
        averageScore popularity trending episodes status season seasonYear
        description(asHtml: false)
        genres
        studios { nodes { name isAnimationStudio } }
        recommendations { nodes { mediaRecommendation { id title { romaji english } coverImage { large } } } }
        nextAiringEpisode { episode timeUntilAiring }
      }
    }
    """
    try:
        resp = await client.post(
            "https://graphql.anilist.co",
            json={"query": QUERY, "variables": {"id": anilist_id}},
        )
        media = resp.json().get("data", {}).get("Media")
        if not media:
            return None

        studios = [
            s["name"]
            for s in media.get("studios", {}).get("nodes", [])
            if s.get("isAnimationStudio")
        ]
        recs = [
            {
                "id": r["mediaRecommendation"]["id"],
                "title": r["mediaRecommendation"]["title"].get("english")
                or r["mediaRecommendation"]["title"].get("romaji"),
                "cover": r["mediaRecommendation"]["coverImage"]["large"],
            }
            for r in media.get("recommendations", {}).get("nodes", [])
            if r.get("mediaRecommendation")
        ]

        result = {
            "anilistId": media["id"],
            "cleanTitle": media["title"].get("english") or media["title"].get("romaji"),
            "nativeTitle": media["title"].get("native"),
            "hdImage": media["coverImage"].get("extraLarge") or media["coverImage"].get("large"),
            "color": media["coverImage"].get("color"),
            "banner": media.get("bannerImage"),
            "score": media.get("averageScore"),
            "popularity": media.get("popularity", 0),
            "trending": media.get("trending", 0),
            "description": media.get("description"),
            "genres": media.get("genres", []),
            "totalEpisodes": media.get("episodes"),
            "status": media.get("status"),
            "season": media.get("season"),
            "year": media.get("seasonYear"),
            "studios": studios,
            "recommendations": recs,
            "nextAiringEpisode": media.get("nextAiringEpisode"),
        }

        # Save to DB
        await upsert_anime_db(result, "anilist_search", str(anilist_id))
        return result

    except Exception as e:
        print(f"[Catalog] _fetch_and_save_anilist error for {anilist_id}: {e}")
        return None


@router.get("/v2/admin/anime/{anilist_id}/episodes", dependencies=[Depends(verify_admin_key)])
async def admin_get_anime_episodes(anilist_id: int):
    try:
        query = """
            SELECT id, "episodeNumber", "providerId", "episodeUrl" 
            FROM episodes 
            WHERE "anilistId" = :anilist_id
            ORDER BY "episodeNumber" ASC, "providerId" ASC
        """
        rows = await database.fetch_all(query, values={"anilist_id": anilist_id})
        return {"success": True, "data": [dict(row) for row in rows]}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/v2/admin/episode/diagnose", dependencies=[Depends(verify_admin_key)])
async def admin_diagnose_episode(request: Request):
    data = await request.json()
    url = data.get("url")
    if not url:
        return {"success": False, "error": "No URL provided"}

    import httpx

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return {
                    "success": True,
                    "status": f"M3U8 HTTP {resp.status_code}",
                    "healthy": False,
                }

            text = resp.text
            if "#EXTM3U" not in text:
                return {"success": True, "status": "Invalid M3U8 Format", "healthy": False}

            duration = 0.0
            first_segment = None
            lines = text.splitlines()
            for line in lines:
                if line.startswith("#EXTINF:"):
                    try:
                        dur_str = line.split(":")[1].split(",")[0]
                        duration += float(dur_str)
                    except:
                        pass
                elif line and not line.startswith("#"):
                    if not first_segment:
                        first_segment = line

            if duration < 300:
                return {
                    "success": True,
                    "status": f"Duration Corrupt ({duration:.1f}s)",
                    "healthy": False,
                    "duration": duration,
                }

            if first_segment:
                # Check segment
                if first_segment.startswith("http"):
                    seg_url = first_segment
                else:
                    base = url.rsplit("/", 1)[0]
                    seg_url = f"{base}/{first_segment}"

                # A lot of proxies or telegram block HEAD, so we use GET with Range to fetch 1 byte
                seg_resp = await client.get(seg_url, headers={"Range": "bytes=0-1"}, timeout=5.0)
                if seg_resp.status_code not in (200, 206):
                    return {
                        "success": True,
                        "status": f"Segment Error (HTTP {seg_resp.status_code})",
                        "healthy": False,
                        "duration": duration,
                    }
            else:
                return {
                    "success": True,
                    "status": "Empty Playlist",
                    "healthy": False,
                    "duration": duration,
                }

            return {"success": True, "status": "Healthy", "healthy": True, "duration": duration}
    except Exception as e:
        return {"success": True, "status": "Unreachable/Timeout", "healthy": False, "error": str(e)}


@router.post("/v2/admin/episode/{episode_id}/reingest", dependencies=[Depends(verify_admin_key)])
async def admin_reingest_episode(episode_id: int, background_tasks: BackgroundTasks):
    try:
        # Fetch episode details
        row = await database.fetch_one(
            'SELECT "anilistId", "episodeNumber", "episodeUrl" FROM episodes WHERE id = :id',
            values={"id": episode_id},
        )
        if not row:
            return {"success": False, "error": "Episode not found in DB"}

        anilist_id = row["anilistId"]
        ep_num = row["episodeNumber"]

        # Delete from episodes table so the next sync sees it as missing
        await database.execute("DELETE FROM episodes WHERE id = :id", values={"id": episode_id})

        # Clear any potential video_cache for this url
        await database.execute(
            'DELETE FROM video_cache WHERE "episodeUrl" = :url', values={"url": row["episodeUrl"]}
        )

        # Clear ingest lock from Upstash Redis
        try:
            from services.cache import upstash_del

            await upstash_del(f"ingest:{anilist_id}:{ep_num}")
            await upstash_del(f"ingest_progress:{anilist_id}:{ep_num}")
        except:
            pass

        # Fast Re-ingest background task
        async def _do_fast_reingest(aid: int, ep: float):
            try:
                print(f"[Admin] Fast re-ingest starting for {aid} Ep {ep}")
                from services.pipeline import sync_anime_episodes
                await sync_anime_episodes(aid)

                from scripts.ingest_pending import ingest_pending
                await ingest_pending(1, anilist_id=str(aid), ep_num=str(ep))
                print(f"[Admin] Fast re-ingest completed for {aid} Ep {ep}")
            except Exception as e:
                print(f"[Admin] Fast re-ingest error for {aid} Ep {ep}: {e}")

        background_tasks.add_task(_do_fast_reingest, anilist_id, ep_num)

        return {
            "success": True,
            "message": f"Episode {ep_num} deleted and queued for fast re-ingestion.",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
