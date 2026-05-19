import asyncio
import difflib
import re

from cachetools import TTLCache

from services.clients import client

GET_ANIME_DETAILS = """
  query ($search: String) {
    Page(page: 1, perPage: 5) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        id
        title {
          romaji
          english
          native
        }
        synonyms
        coverImage {
          extraLarge
          large
          color
        }
        bannerImage
        averageScore
        popularity
        trending
        episodes
        status
        season
        seasonYear
        description(asHtml: false)
        genres
        tags {
          name
          rank
        }
        studios {
          nodes {
            name
            isAnimationStudio
          }
        }
        recommendations {
          nodes {
            mediaRecommendation {
              id
              title { romaji english }
              coverImage { large }
            }
          }
        }
        relations {
          edges {
            relationType
            node {
              id
              title { romaji english }
              coverImage { large }
              type
            }
          }
        }
        nextAiringEpisode {
          episode
          timeUntilAiring
          airingAt
        }
      }
    }
  }
"""

anilist_cache = TTLCache(maxsize=1000, ttl=86400)
anilist_sem = asyncio.Semaphore(5)

GET_ANIME_BY_ID = """
  query ($id: Int) {
    Media(id: $id, type: ANIME, isAdult: false) {
      id
      idMal
      title {
        romaji
        english
        native
      }
      synonyms
      coverImage {
        extraLarge
        large
        color
      }
      bannerImage
      averageScore
      popularity
      trending
      episodes
      status
      season
      seasonYear
      description(asHtml: false)
      genres
      tags {
        name
        rank
      }
      studios {
        nodes {
          name
          isAnimationStudio
        }
      }
      recommendations {
        nodes {
          mediaRecommendation {
            id
            title { romaji english }
            coverImage { large }
          }
        }
      }
      relations {
        edges {
          relationType
          node {
            id
            title { romaji english }
            coverImage { large }
            type
          }
        }
      }
      nextAiringEpisode {
        episode
        timeUntilAiring
        airingAt
      }
    }
  }
"""


async def fetch_anilist_info_by_id(anilist_id: int):
    cache_key = f"anilist_id_{anilist_id}"
    if cache_key in anilist_cache:
        return anilist_cache[cache_key]

    async with anilist_sem:
        try:
            response = await client.post(
                "https://graphql.anilist.co",
                json={"query": GET_ANIME_BY_ID, "variables": {"id": anilist_id}},
            )

            data = response.json()
            media = data.get("data", {}).get("Media")

            if not media:
                anilist_cache[cache_key] = None
                return None

            studios = []
            if media.get("studios") and media["studios"].get("nodes"):
                studios = [
                    s["name"] for s in media["studios"]["nodes"] if s.get("isAnimationStudio")
                ]

            recs = []
            if media.get("recommendations") and media["recommendations"].get("nodes"):
                for r in media["recommendations"]["nodes"]:
                    rec_media = r.get("mediaRecommendation")
                    if rec_media:
                        recs.append(
                            {
                                "id": rec_media.get("id"),
                                "title": rec_media.get("title", {}).get("english")
                                or rec_media.get("title", {}).get("romaji"),
                                "cover": rec_media.get("coverImage", {}).get("large"),
                            }
                        )

            relations = []
            if media.get("relations") and media["relations"].get("edges"):
                for edge in media["relations"]["edges"]:
                    rel_media = edge.get("node")
                    if rel_media and rel_media.get("type") == "ANIME":
                        relations.append(
                            {
                                "id": rel_media.get("id"),
                                "relationType": edge.get("relationType"),
                                "title": rel_media.get("title", {}).get("english")
                                or rel_media.get("title", {}).get("romaji"),
                                "cover": rel_media.get("coverImage", {}).get("large"),
                            }
                        )

            genres = media.get("genres") or []
            tags = media.get("tags") or []

            # Enrich genres with high-ranking tags (>= 60%)
            for tag in tags:
                tag_name = tag.get("name")
                tag_rank = tag.get("rank", 0)
                if tag_name and tag_rank >= 60 and tag_name not in genres:
                    # Optional: filter out overly generic or spoiler tags if necessary
                    # but for metadata richness, we append them here.
                    genres.append(tag_name)

            result = {
                "anilistId": media["id"],
                "mal_id": media.get("idMal"),
                "cleanTitle": media["title"].get("english") or media["title"].get("romaji"),
                "romajiTitle": media["title"].get("romaji"),
                "nativeTitle": media["title"].get("romaji"),
                "synonyms": media.get("synonyms", []),
                "hdImage": media["coverImage"].get("extraLarge")
                or media["coverImage"].get("large"),
                "color": media["coverImage"].get("color"),
                "banner": media.get("bannerImage"),
                "score": media.get("averageScore"),
                "popularity": media.get("popularity", 0),
                "trending": media.get("trending", 0),
                "description": media.get("description"),
                "genres": genres,
                "episodes": media.get("episodes"),
                "status": media.get("status"),
                "season": media.get("season"),
                "seasonYear": media.get("seasonYear"),
                "studios": studios,
                "recommendations": recs,
                "relations": relations,
                "nextAiringEpisode": media.get("nextAiringEpisode"),
            }
            anilist_cache[cache_key] = result
            return result

        except Exception as e:
            print(f"[AniList] Error fetching data by ID '{anilist_id}': {str(e)}")
            return None


def roman_to_int(s):
    rom_val = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    int_val = 0
    for i in range(len(s)):
        if i > 0 and rom_val[s[i]] > rom_val[s[i - 1]]:
            int_val += rom_val[s[i]] - 2 * rom_val[s[i - 1]]
        else:
            int_val += rom_val[s[i]]
    return int_val


async def fetch_anilist_info(title: str):
    search_query = re.sub(
        r"\b(episode|ep|sub indo|batch)\b", "", title, flags=re.IGNORECASE
    ).strip()
    season_match = re.search(r"\b(?:S|Season|Part)\s*(\d+|[IVX]+)\b", search_query, re.IGNORECASE)
    target_season = None
    if season_match:
        val = season_match.group(1).upper()
        if val.isdigit():
            target_season = int(val)
        else:
            target_season = roman_to_int(val)

    base_query = re.sub(
        r"\b(?:S|Season|Part)\s*(\d+|[IVX]+)\b", "", search_query, flags=re.IGNORECASE
    ).strip()
    base_query = re.sub(r"[^a-zA-Z0-9 ]", " ", base_query).strip()
    base_query = re.sub(r"\s+", " ", base_query)

    cache_key = f"{base_query}_S{target_season}" if target_season else base_query

    if cache_key in anilist_cache:
        return anilist_cache[cache_key]

    async with anilist_sem:
        try:
            response = await client.post(
                "https://graphql.anilist.co",
                json={"query": GET_ANIME_DETAILS, "variables": {"search": search_query}},
            )

            data = response.json()
            media_list = data.get("data", {}).get("Page", {}).get("media", [])

            if not media_list and target_season:
                response = await client.post(
                    "https://graphql.anilist.co",
                    json={"query": GET_ANIME_DETAILS, "variables": {"search": base_query}},
                )
                data = response.json()
                media_list = data.get("data", {}).get("Page", {}).get("media", [])

            if not media_list:
                anilist_cache[cache_key] = None
                return None

            media_list = [m for m in media_list if "Hentai" not in m.get("genres", [])]
            if not media_list:
                anilist_cache[cache_key] = None
                return None

            best_media = None
            highest_score = 0.0

            for m in media_list:
                titles = [
                    m["title"].get("romaji"),
                    m["title"].get("english"),
                    m["title"].get("native"),
                ]
                valid_titles = [t.lower() for t in titles if t]
                if not valid_titles:
                    continue
                score = max(
                    difflib.SequenceMatcher(None, search_query.lower(), t).ratio()
                    for t in valid_titles
                )
                if score > highest_score:
                    highest_score = score
                    best_media = m

            if highest_score < 0.7:
                print(
                    f"[AniList] Rejecting match for '{search_query}', highest similarity score is {highest_score:.2f} (< 0.7)"
                )
                anilist_cache[cache_key] = None
                return None

            media = best_media

            if target_season:
                for m in media_list:
                    titles = [m["title"].get("romaji") or "", m["title"].get("english") or ""]
                    combined_title = " ".join(titles).lower()
                    if re.search(
                        rf"\b(?:season\s*{target_season}|{target_season}th\s*season|part\s*{target_season})\b",
                        combined_title,
                    ) or re.search(rf"\b(season|part)\s+{target_season}\b", combined_title):
                        media = m
                        break

            studios = []
            if media.get("studios") and media["studios"].get("nodes"):
                studios = [
                    s["name"] for s in media["studios"]["nodes"] if s.get("isAnimationStudio")
                ]

            recs = []
            if media.get("recommendations") and media["recommendations"].get("nodes"):
                for r in media["recommendations"]["nodes"]:
                    rec_media = r.get("mediaRecommendation")
                    if rec_media:
                        recs.append(
                            {
                                "id": rec_media.get("id"),
                                "title": rec_media.get("title", {}).get("english")
                                or rec_media.get("title", {}).get("romaji"),
                                "cover": rec_media.get("coverImage", {}).get("large"),
                            }
                        )

            relations = []
            if media.get("relations") and media["relations"].get("edges"):
                for edge in media["relations"]["edges"]:
                    rel_media = edge.get("node")
                    if rel_media and rel_media.get("type") == "ANIME":
                        relations.append(
                            {
                                "id": rel_media.get("id"),
                                "relationType": edge.get("relationType"),
                                "title": rel_media.get("title", {}).get("english")
                                or rel_media.get("title", {}).get("romaji"),
                                "cover": rel_media.get("coverImage", {}).get("large"),
                            }
                        )

            genres = media.get("genres") or []
            tags = media.get("tags") or []

            # Enrich genres with high-ranking tags (>= 60%)
            for tag in tags:
                tag_name = tag.get("name")
                tag_rank = tag.get("rank", 0)
                if tag_name and tag_rank >= 60 and tag_name not in genres:
                    genres.append(tag_name)

            result = {
                "anilistId": media["id"],
                "mal_id": media.get("idMal"),
                "cleanTitle": media["title"]["english"] or media["title"]["romaji"],
                "romajiTitle": media["title"].get("romaji"),
                "nativeTitle": media["title"].get("native"),
                "synonyms": media.get("synonyms", []),
                "hdImage": media["coverImage"]["extraLarge"] or media["coverImage"]["large"],
                "color": media["coverImage"].get("color"),
                "banner": media["bannerImage"],
                "score": media["averageScore"],
                "popularity": media.get("popularity", 0),
                "trending": media.get("trending", 0),
                "description": media.get("description"),
                "genres": genres,
                "episodes": media.get("episodes"),
                "status": media.get("status"),
                "season": media.get("season"),
                "seasonYear": media.get("seasonYear"),
                "studios": studios,
                "recommendations": recs,
                "relations": relations,
                "nextAiringEpisode": media.get("nextAiringEpisode"),
            }
            anilist_cache[cache_key] = result
            return result

        except Exception as e:
            print(f"[AniList] Error fetching data for '{search_query}': {str(e)}")
            return None

GET_MANGA_HOME = """
query {
  trending: Page(page: 1, perPage: 35) {
    media(type: MANGA, sort: TRENDING_DESC, isAdult: false) {
      id title { romaji english native } coverImage { extraLarge large color } bannerImage averageScore popularity chapters status description(asHtml: false) genres
    }
  }
  popular: Page(page: 1, perPage: 35) {
    media(type: MANGA, sort: POPULARITY_DESC, isAdult: false) {
      id title { romaji english native } coverImage { extraLarge large color } bannerImage averageScore popularity chapters status description(asHtml: false) genres
    }
  }
  latest: Page(page: 1, perPage: 40) {
    media(type: MANGA, sort: UPDATED_AT_DESC, isAdult: false) {
      id title { romaji english native } coverImage { extraLarge large color } bannerImage averageScore popularity chapters status description(asHtml: false) genres
    }
  }
}
"""

GET_MANGA_BY_ID = """
  query ($id: Int) {
    Media(id: $id, type: MANGA, isAdult: false) {
      id
      idMal
      title { romaji english native }
      synonyms
      coverImage { extraLarge large color }
      bannerImage
      averageScore
      popularity
      trending
      chapters
      volumes
      status
      description(asHtml: false)
      genres
      tags { name rank }
      staff { nodes { name { full } primaryOccupations } }
      recommendations {
        nodes {
          mediaRecommendation {
            id
            title { romaji english }
            coverImage { large }
          }
        }
      }
      relations {
        edges {
          relationType
          node {
            id
            title { romaji english }
            coverImage { large }
            type
          }
        }
      }
    }
  }
"""

GET_MANGA_SEARCH = """
  query ($search: String, $page: Int, $perPage: Int, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage perPage }
      media(search: $search, type: MANGA, sort: $sort, isAdult: false) {
        id
        title { romaji english native }
        coverImage { extraLarge large color }
        averageScore
        popularity
        chapters
        status
        genres
      }
    }
  }
"""

async def check_manga_availability(title: str) -> bool:
    import httpx
    from bs4 import BeautifulSoup
    try:
        async with httpx.AsyncClient(timeout=5.0) as http_client:
            res = await http_client.get(f"https://komikindo.ch/?s={title}")
            soup = BeautifulSoup(res.text, "html.parser")
            return len(soup.select(".animepost")) > 0
    except Exception:
        return False

async def filter_valid_manga(media_list: list, limit: int = 15) -> list:
    import asyncio
    valid_media = []
    
    async def validate_and_append(m):
        title = m["title"].get("english") or m["title"].get("romaji") or m["title"].get("native")
        if not title:
            return None
        is_valid = await check_manga_availability(title)
        return m if is_valid else None
        
    tasks = [validate_and_append(m) for m in media_list]
    results = await asyncio.gather(*tasks)
    
    for r in results:
        if r is not None:
            valid_media.append(r)
            if len(valid_media) >= limit:
                break
                
    return valid_media

async def fetch_anilist_manga_home():
    cache_key = "anilist_manga_home"
    if cache_key in anilist_cache:
        return anilist_cache[cache_key]
    async with anilist_sem:
        try:
            response = await client.post("https://graphql.anilist.co", json={"query": GET_MANGA_HOME})
            data = response.json().get("data", {})
            if not data: return None
            
            trending_raw = data.get("trending", {}).get("media", [])
            popular_raw = data.get("popular", {}).get("media", [])
            latest_raw = data.get("latest", {}).get("media", [])
            
            trending_valid = await filter_valid_manga(trending_raw, 15)
            popular_valid = await filter_valid_manga(popular_raw, 15)
            latest_valid = await filter_valid_manga(latest_raw, 20)
            
            def format_manga(m):
                return {
                    "anilistId": m["id"],
                    "cleanTitle": m["title"].get("english") or m["title"].get("romaji"),
                    "nativeTitle": m["title"].get("native"),
                    "coverImage": m["coverImage"].get("extraLarge") or m["coverImage"].get("large"),
                    "color": m["coverImage"].get("color"),
                    "bannerImage": m.get("bannerImage"),
                    "score": m.get("averageScore"),
                    "popularity": m.get("popularity", 0),
                    "episodes": m.get("chapters"),
                    "latestEpisode": m.get("chapters"), # for UI compatibility
                    "status": m.get("status"),
                    "genres": m.get("genres", [])
                }
                
            res = {
                "trending": [format_manga(m) for m in trending_valid],
                "popular": [format_manga(m) for m in popular_valid],
                "latest": [format_manga(m) for m in latest_valid]
            }
            anilist_cache[cache_key] = res
            return res
        except Exception as e:
            print(f"[AniList] Error fetching manga home: {e}")
            return None

async def fetch_anilist_manga_by_id(anilist_id: int):
    cache_key = f"anilist_manga_{anilist_id}"
    if cache_key in anilist_cache:
        return anilist_cache[cache_key]
    async with anilist_sem:
        try:
            response = await client.post("https://graphql.anilist.co", json={"query": GET_MANGA_BY_ID, "variables": {"id": anilist_id}})
            media = response.json().get("data", {}).get("Media")
            if not media: return None
            
            authors = [s.get("name", {}).get("full", "Unknown") for s in media.get("staff", {}).get("nodes", []) if "Story & Art" in s.get("primaryOccupations", []) or "Story" in s.get("primaryOccupations", [])]
            author = authors[0] if authors else "Unknown"

            recs = [{"id": r["mediaRecommendation"]["id"], "title": r["mediaRecommendation"]["title"].get("english") or r["mediaRecommendation"]["title"].get("romaji"), "cover": r["mediaRecommendation"]["coverImage"]["large"]} for r in media.get("recommendations", {}).get("nodes", []) if r.get("mediaRecommendation")]

            relations = [{"id": edge["node"]["id"], "relationType": edge["relationType"], "title": edge["node"]["title"].get("english") or edge["node"]["title"].get("romaji"), "cover": edge["node"]["coverImage"]["large"]} for edge in media.get("relations", {}).get("edges", []) if edge.get("node") and edge["node"].get("type") == "MANGA"]

            genres = media.get("genres") or []
            tags = media.get("tags") or []
            for tag in tags:
                if tag.get("name") and tag.get("rank", 0) >= 60 and tag.get("name") not in genres:
                    genres.append(tag["name"])

            res = {
                "id": str(media["id"]),
                "anilistId": media["id"],
                "mal_id": media.get("idMal"),
                "title": media["title"].get("english") or media["title"].get("romaji"),
                "cleanTitle": media["title"].get("english") or media["title"].get("romaji"),
                "romajiTitle": media["title"].get("romaji"),
                "nativeTitle": media["title"].get("native"),
                "synonyms": media.get("synonyms", []),
                "img": media["coverImage"].get("extraLarge") or media["coverImage"].get("large"),
                "color": media["coverImage"].get("color"),
                "banner": media.get("bannerImage"),
                "score": media.get("averageScore"),
                "popularity": media.get("popularity", 0),
                "trending": media.get("trending", 0),
                "synopsis": media.get("description"),
                "genres": genres,
                "chapters": [], # will be filled by bridging layer
                "totalEps": media.get("chapters"),
                "status": media.get("status"),
                "author": author,
                "recommendations": recs,
                "relations": relations
            }
            anilist_cache[cache_key] = res
            return res
        except Exception as e:
            print(f"[AniList] Error fetching manga by ID {anilist_id}: {e}")
            return None

async def search_anilist_manga(q: str, page: int = 1, perPage: int = 24, sort: str = "POPULARITY_DESC"):
    cache_key = f"anilist_manga_search_{q}_{page}_{sort}"
    if cache_key in anilist_cache:
        return anilist_cache[cache_key]
    async with anilist_sem:
        try:
            variables = {"search": q if q else None, "page": page, "perPage": perPage, "sort": [sort]}
            response = await client.post("https://graphql.anilist.co", json={"query": GET_MANGA_SEARCH, "variables": variables})
            data = response.json().get("data", {}).get("Page", {})
            media_list = data.get("media", [])
            
            # Validasi ketersediaan di provider (Komikindo) sebelum ditampilkan
            valid_media_list = await filter_valid_manga(media_list, limit=perPage)
            
            def format_manga(m):
                return {
                    "anilistId": m["id"],
                    "cleanTitle": m["title"].get("english") or m["title"].get("romaji"),
                    "nativeTitle": m["title"].get("native"),
                    "coverImage": m["coverImage"].get("extraLarge") or m["coverImage"].get("large"),
                    "color": m["coverImage"].get("color"),
                    "score": m.get("averageScore"),
                    "popularity": m.get("popularity", 0),
                    "episodes": m.get("chapters"),
                    "latestEpisode": m.get("chapters"),
                    "status": m.get("status"),
                    "genres": m.get("genres", [])
                }
            
            res = [format_manga(m) for m in valid_media_list]
            anilist_cache[cache_key] = res
            return res
        except Exception as e:
            print(f"[AniList] Error searching manga: {e}")
            return []
