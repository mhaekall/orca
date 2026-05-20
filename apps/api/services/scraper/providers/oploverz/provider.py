import urllib.parse

from ..base_parser import AnimeDetail
from ..base_provider import BaseProvider
from .parser import OploverzParser

from services.transport import ProviderTransport

BASE = "https://vip.oploverz.ltd"

class OploverzProvider(BaseProvider):
    def __init__(self, transport: ProviderTransport):
        self._t = transport
        self._p = OploverzParser()

    async def get_anime_detail(self, series_url: str) -> AnimeDetail:
        html = await self._t.get_html(series_url)
        return self._p.parse_episode_list(html, BASE)

    async def _resolve_iframe(self, client, iframe_src: str, referer: str) -> str | None:
        try:
            import re
            res = await client.get(iframe_src, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": referer
            })
            html = res.text

            # Pattern 1: <source src="URL">
            source_match = re.search(r'<source\s+[^>]*src=["\']([^"\']+)["\']', html, re.IGNORECASE)
            if source_match:
                return source_match.group(1)

            # Pattern 2: JSON "url": "URL"
            url_match = re.search(r'"url"\s*:\s*"([^"]+)"', html)
            if url_match:
                url = url_match.group(1).replace('\\/', '/')
                if '.mp4' in url or '.m3u8' in url:
                    return url

            # Pattern 3: mp4upload
            mp4upload_match = re.search(r'player\.src\(\s*\{\s*src:\s*["\']([^"\']+)["\']', html)
            if mp4upload_match:
                return mp4upload_match.group(1)

        except Exception:
            pass
        return None

    async def get_episode_sources(self, episode_url: str):
        html = await self._t.get_html(episode_url)
        sources = self._p.parse_episode_sources(html)

        # Enrich sources
        client = self._t.get_client()
        import asyncio
        async def enrich(src):
            if src.get('type') == 'iframe':
                direct_url = await self._resolve_iframe(client, src['url'], episode_url)
                if direct_url:
                    src['url'] = direct_url
                    src['type'] = 'mp4 (direct)' if '.mp4' in direct_url.lower() else 'hls (direct)'
            return src

        resolved_sources = await asyncio.gather(*(enrich(dict(s)) for s in sources))
        
        # Blacklist mirror Nonton Online (iframe proteksi) yang gagal diekstrak
        BLACKLIST = ['nonton online', 'mega', 'filedon', 'vidhide', 'pucuk', 'gofile', 'kraken', 'acefile', 'mediafire', 'doodstream', 'zippyshare', 'solidfiles']
        usable_sources = []
        for s in resolved_sources:
            provider_str = str(s.get('provider', '')).lower()
            url_str = str(s.get('url', '')).lower()
            if any(b in provider_str or b in url_str for b in BLACKLIST):
                continue
            usable_sources.append(s)
            
        return usable_sources

    async def search(self, query: str) -> list[dict]:
        """Search for anime on Oploverz."""
        try:
            url = f"{BASE}/?s={urllib.parse.quote_plus(query)}"
            html = await self._t.get_html(url)
            return self._p.parse_search_results(html)
        except Exception as e:
            print(f"[Oploverz] Search error: {e}")
            return []
