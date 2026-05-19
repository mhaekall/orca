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

CURATED_MANGA_IDS = [
    # Strictly Verified Masterpieces on Komikindo/Bacakomik (Score 82+)
    30001, 30002, 30003, 30013, 30025, 30026, 30028, 30044, 30081, 30642, 
    30656, 30657, 43245, 46765, 74489, 75143, 85135, 86099, 86559, 86964, 
    100568, 104677, 105398, 106929, 107521, 116170, 117620
]

BANNED_GENRES = ["Ecchi", "Hentai", "Boys Love", "Yaoi", "Girls Love", "Yuri", "Smut"]

GET_MANGA_HOME = """
query ($ids: [Int]) {
  Page(page: 1, perPage: 50) {
    media(id_in: $ids, type: MANGA, isAdult: false, genre_not_in: ["Ecchi", "Hentai", "Boys Love", "Yaoi", "Girls Love", "Yuri", "Smut"]) {
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
      media(search: $search, type: MANGA, sort: $sort, isAdult: false, genre_not_in: ["Ecchi", "Hentai", "Boys Love", "Yaoi", "Girls Love", "Yuri", "Smut"]) {
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

async def check_manga_availability(title: str, sem: asyncio.Semaphore) -> tuple[bool, int]:
    from curl_cffi.requests import AsyncSession
    from bs4 import BeautifulSoup
    import urllib.parse
    import re
    import difflib
    
    def get_best_post(posts, target_title):
        best_post = None
        best_score = -1.0
        for p in posts:
            title_el = p.select_one(".tt h3, .tt h4, .tt")
            post_title = title_el.text.strip() if title_el else ""
            score = difflib.SequenceMatcher(None, target_title.lower(), post_title.lower()).ratio()
            if score > best_score:
                best_score = score
                best_post = p
        # If the best score is too low, we might still just return the best one found, 
        # or we could enforce a threshold. For now, returning the absolute best match.
        return best_post

    async with sem:
        try:
            safe_title = urllib.parse.quote(title)
            async with AsyncSession(impersonate="chrome110", timeout=12.0) as s:
                # 1. Cek Komikindo
                res1 = await s.get(f"https://komikindo.ch/?s={safe_title}")
                if res1.status_code not in [403, 503]:
                    soup1 = BeautifulSoup(res1.text, "html.parser")
                    posts = soup1.select(".animepost")
                    if posts:
                        best_post = get_best_post(posts, title)
                        link_el = best_post.select_one("a") if best_post else None
                        if link_el and 'href' in link_el.attrs:
                            detail_url = link_el['href']
                            res_det = await s.get(detail_url)
                            soup_det = BeautifulSoup(res_det.text, "html.parser")
                            chapters = soup_det.select("#chapter_list .lchx a")
                            if chapters:
                                match = re.search(r'\d+', chapters[0].text)
                                if match: return True, int(match.group())
                        return True, 0
                
                # 2. Cek Bacakomik
                res2 = await s.get(f"https://bacakomik.my/?s={safe_title}")
                if res2.status_code not in [403, 503]:
                    soup2 = BeautifulSoup(res2.text, "html.parser")
                    posts = soup2.select(".animepost")
                    if posts:
                        best_post = get_best_post(posts, title)
                        link_el = best_post.select_one("a") if best_post else None
                        if link_el and 'href' in link_el.attrs:
                            detail_url = link_el['href']
                            res_det = await s.get(detail_url)
                            soup_det = BeautifulSoup(res_det.text, "html.parser")
                            chapters = soup_det.select("#chapterlist .lchx a")
                            if not chapters:
                                chapters = soup_det.select(".bxcl ul li .lchx a")
                            if chapters:
                                match = re.search(r'\d+', chapters[0].text)
                                if match: return True, int(match.group())
                        return True, 0
                
                # Fallback jika cloudflare block
                if res1.status_code in [403, 503] and res2.status_code in [403, 503]:
                    return True, 0
                    
                return False, 0
        except Exception as e:
            print(f"[Manga Validation Error] {title}: {e}")
            return True, 0 # Fallback to True on timeout/error

async def filter_valid_manga(media_list: list, limit: int = 15) -> list:
    import asyncio
    valid_media = []
    
    # Limit concurrency to 5 to avoid hammering the provider and getting blocked
    sem = asyncio.Semaphore(5)
    
    async def validate_and_append(m):
        title = m["title"].get("english") or m["title"].get("romaji") or m["title"].get("native")
        if not title:
            return None
        is_valid, ch_num = await check_manga_availability(title, sem)
        if is_valid:
            if ch_num > 0:
                m["chapters"] = ch_num
            return m
        return None
        
    tasks = [validate_and_append(m) for m in media_list]
    results = await asyncio.gather(*tasks)
    
    for r in results:
        if r is not None:
            valid_media.append(r)
            if len(valid_media) >= limit:
                break
                
    return valid_media

async def fetch_anilist_manga_home():
    cache_key = "anilist_manga_home_curated"
    if cache_key in anilist_cache:
        return anilist_cache[cache_key]
    async with anilist_sem:
        try:
            variables = {"ids": CURATED_MANGA_IDS}
            response = await client.post("https://graphql.anilist.co", json={"query": GET_MANGA_HOME, "variables": variables})
            data = response.json().get("data", {}).get("Page", {})
            media_list = data.get("media", [])
            
            if not media_list: return None
            
            # Since we curated them, we just validate them
            valid_media = await filter_valid_manga(media_list, limit=50)
            
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
                    "latestEpisode": m.get("chapters"),
                    "status": m.get("status"),
                    "genres": m.get("genres", [])
                }
                
            formatted = [format_manga(m) for m in valid_media]
            
            # Manually split the curated list into trending, popular, latest for the UI to consume
            sorted_by_pop = sorted(formatted, key=lambda x: x["popularity"], reverse=True)
            sorted_by_score = sorted(formatted, key=lambda x: x["score"] or 0, reverse=True)
            
            # For latest, let's just pick some releasing ones or top scored
            releasing = [m for m in formatted if m["status"] == "RELEASING"]
            
            res = {
                "trending": sorted_by_score[:15],
                "popular": sorted_by_pop[:15],
                "latest": releasing[:20] if len(releasing) >= 10 else sorted_by_pop[15:35]
            }
            anilist_cache[cache_key] = res
            return res
        except Exception as e:
            print(f"[AniList] Error fetching manga home: {e}")
            return None

async def fetch_manga_chapters_from_provider(title: str) -> list:
    from curl_cffi.requests import AsyncSession
    from bs4 import BeautifulSoup
    import urllib.parse
    import re
    
    chapters_data = []
    try:
        safe_title = urllib.parse.quote(title)
        async with AsyncSession(impersonate="chrome110", timeout=12.0) as s:
            # 1. Cek Komikindo
            res1 = await s.get(f"https://komikindo.ch/?s={safe_title}")
            if res1.status_code not in [403, 503]:
                soup1 = BeautifulSoup(res1.text, "html.parser")
                posts = soup1.select(".animepost")
                if posts:
                    link_el = posts[0].select_one("a")
                    if link_el and 'href' in link_el.attrs:
                        detail_url = link_el['href']
                        res_det = await s.get(detail_url)
                        soup_det = BeautifulSoup(res_det.text, "html.parser")
                        chapters = soup_det.select("#chapter_list .lchx a")
                        for ch in chapters:
                            ch_title = ch.text.strip()
                            ch_link = ch['href']
                            match = re.search(r'\d+', ch_title)
                            ch_num = match.group() if match else ch_title
                            chapters_data.append({
                                "id": f"komikindo|{urllib.parse.quote(ch_link)}",
                                "number": str(ch_num),
                                "episodeNumber": float(ch_num) if str(ch_num).replace('.','',1).isdigit() else 0,
                                "title": ch_title,
                                "url": ch_link
                            })
                        if chapters_data:
                            return chapters_data
                            
            # 2. Cek Bacakomik
            res2 = await s.get(f"https://bacakomik.my/?s={safe_title}")
            if res2.status_code not in [403, 503]:
                soup2 = BeautifulSoup(res2.text, "html.parser")
                posts = soup2.select(".animepost")
                if posts:
                    link_el = posts[0].select_one("a")
                    if link_el and 'href' in link_el.attrs:
                        detail_url = link_el['href']
                        res_det = await s.get(detail_url)
                        soup_det = BeautifulSoup(res_det.text, "html.parser")
                        chapters = soup_det.select("#chapterlist .lchx a")
                        if not chapters:
                            chapters = soup_det.select(".bxcl ul li .lchx a")
                        for ch in chapters:
                            ch_title = ch.text.strip()
                            ch_link = ch['href']
                            match = re.search(r'\d+', ch_title)
                            ch_num = match.group() if match else ch_title
                            chapters_data.append({
                                "id": f"bacakomik|{urllib.parse.quote(ch_link)}",
                                "number": str(ch_num),
                                "episodeNumber": float(ch_num) if str(ch_num).replace('.','',1).isdigit() else 0,
                                "title": ch_title,
                                "url": ch_link
                            })
                        if chapters_data:
                            return chapters_data
    except Exception as e:
        print(f"[Manga Chapter Fetch Error] {title}: {e}")
        
    return chapters_data

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

            title_for_search = media["title"].get("english") or media["title"].get("romaji")
            provider_chapters = await fetch_manga_chapters_from_provider(title_for_search) if title_for_search else []

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
                "chapters": provider_chapters,
                "totalEps": len(provider_chapters) if provider_chapters else media.get("chapters"),
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
