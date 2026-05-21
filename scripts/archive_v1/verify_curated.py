import asyncio
from curl_cffi.requests import AsyncSession
from bs4 import BeautifulSoup
import urllib.parse
import httpx

CURATED_MANGA_IDS = [
    # Top Manga Masterpieces (Score 86+)
    30002, 31706, 30656, 30013, 64053, 30001, 30642, 30051, 74489, 46765, 
    30657, 30025, 31303, 65243, 87395, 30104, 30028, 34632, 30003, 86082, 
    75143, 30026, 118371, 31224, 86635, 112275, 85135, 51525, 37375, 30007, 
    118586, 116170, 106331, 140475, 98263, 117620, 43245, 30336, 30081, 107279, 
    86559, 85412, 39982, 30044,

    # Top Manhwa Masterpieces (Score 82+)
    140407, 119257, 187944, 119521, 121565, 100568, 106929, 177706, 86099, 132144, 
    105398, 118408, 159441, 119174, 107521, 86964, 138705, 131640, 175946, 128067, 
    104677, 143003
]

GET_MANGA_INFO = """
query ($ids: [Int]) {
  Page(page: 1, perPage: 100) {
    media(id_in: $ids, type: MANGA) {
      id title { english romaji }
    }
  }
}
"""

async def main():
    async with httpx.AsyncClient() as client:
        res = await client.post("https://graphql.anilist.co", json={"query": GET_MANGA_INFO, "variables": {"ids": CURATED_MANGA_IDS}})
        media = res.json()["data"]["Page"]["media"]
    
    valid_ids = []
    invalid_titles = []
    
    async with AsyncSession(impersonate="chrome110", timeout=15.0) as s:
        for m in media:
            title = m["title"].get("english") or m["title"].get("romaji")
            safe_title = urllib.parse.quote(title)
            
            # Cek komikindo
            r1 = await s.get(f"https://komikindo.ch/?s={safe_title}")
            s1 = BeautifulSoup(r1.text, "html.parser")
            if len(s1.select(".animepost")) > 0:
                valid_ids.append(m["id"])
                print(f"[V] {title}")
                continue
                
            # Cek bacakomik
            r2 = await s.get(f"https://bacakomik.my/?s={safe_title}")
            s2 = BeautifulSoup(r2.text, "html.parser")
            if len(s2.select(".animepost")) > 0:
                valid_ids.append(m["id"])
                print(f"[V] {title}")
                continue
                
            # Coba short title
            short_title = " ".join(title.split()[:3])
            if short_title != title:
                r1 = await s.get(f"https://komikindo.ch/?s={urllib.parse.quote(short_title)}")
                s1 = BeautifulSoup(r1.text, "html.parser")
                if len(s1.select(".animepost")) > 0:
                    valid_ids.append(m["id"])
                    print(f"[V] {title} (using '{short_title}')")
                    continue
            
            print(f"[X] {title}")
            invalid_titles.append(title)
            
    print(f"\nFound {len(valid_ids)} valid mangas out of {len(CURATED_MANGA_IDS)}")
    print("Valid IDs:", valid_ids)

asyncio.run(main())
