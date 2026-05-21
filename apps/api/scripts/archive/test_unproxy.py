import asyncio
import os
import sys
import urllib.parse
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from bs4 import BeautifulSoup
import httpx

sys.path.insert(0, os.path.abspath('.'))

def load_env():
    if os.path.exists('.env'):
        with open('.env') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, val = line.strip().split('=', 1)
                    os.environ[key] = val.strip('"\'')

async def fetch_html(url: str):
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        res = await client.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        return res.text

async def find_kuronime_url(title: str, ep_num: float) -> str | None:
    try:
        search_url = f"https://kuronime.sbs/?s={urllib.parse.quote_plus(title)}"
        html = await fetch_html(search_url)
        soup = BeautifulSoup(html, "html.parser")
        
        # Get first search result
        first_result = soup.select_one(".bsx a")
        if not first_result:
            return None
            
        series_url = first_result.get("href")
        
        # Get episodes list
        series_html = await fetch_html(series_url)
        s_soup = BeautifulSoup(series_html, "html.parser")
        
        for li in s_soup.select(".bxcl ul li"):
            a = li.select_one(".lchx a")
            if not a: continue
            ep_url = a.get("href")
            ep_title = a.text.strip()
            
            # Very basic check to see if episode number matches
            if f"Episode {int(ep_num)}" in ep_title or f"Episode {ep_num}" in ep_title:
                return ep_url
                
    except Exception as e:
        print(f"Error searching Kuronime for {title}: {e}")
    return None

async def main():
    load_env()
    db_url = os.getenv("DATABASE_URL")
    if db_url and db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if db_url and "?sslmode=" in db_url:
        db_url = db_url.split("?sslmode=")[0]
        
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        # 1. Ambil sampel anime yang menggunakan tele-proxy
        res = await conn.execute(text("""
            SELECT e.id, e."episodeNumber", m."cleanTitle" 
            FROM episodes e 
            JOIN anime_metadata m ON e."anilistId" = m."anilistId"
            WHERE e."episodeUrl" LIKE '%tele-proxy%'
            LIMIT 10
        """))
        
        rows = res.fetchall()
        print(f"Ditemukan {len(rows)} episode ber-proxy untuk diuji:")
        
        for row in rows:
            ep_id = row[0]
            ep_num = row[1]
            title = row[2]
            
            print(f"\n[{title}] Eps {ep_num}...")
            kuronime_url = await find_kuronime_url(title, ep_num)
            
            if kuronime_url:
                print(f" -> BERHASIL MENDAPATKAN URL ASLI: {kuronime_url}")
                # Note: We are just testing here, not actually updating the DB yet
            else:
                print(" -> Gagal menemukan URL asli di Kuronime.")

if __name__ == "__main__":
    asyncio.run(main())
