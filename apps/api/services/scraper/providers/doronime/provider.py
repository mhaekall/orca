from ..base_parser import AnimeDetail, EpisodeSource
from ..base_provider import BaseProvider
from .parser import DoronimeParser

from services.transport import ProviderTransport

BASE = "https://doronime.id"

class DoronimeProvider(BaseProvider):
    def __init__(self, transport: ProviderTransport):
        self._t = transport
        self._p = DoronimeParser()
        self._headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": BASE
        }

    async def get_anime_detail(self, series_url: str) -> AnimeDetail:
        client = self._t.get_client()
        res = await client.get(series_url, headers=self._headers)
        return self._p.parse_episode_list(res.text, BASE)

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

    async def get_episode_sources(self, episode_url: str) -> list[EpisodeSource]:
        client = self._t.get_client()
        res = await client.get(episode_url, headers=self._headers)
        sources = self._p.parse_episode_sources(res.text)

        # Enrich sources
        import asyncio
        async def enrich(src):
            if src.get('type') == 'iframe':
                direct_url = await self._resolve_iframe(client, src['url'], episode_url)
                if direct_url:
                    src['url'] = direct_url
                    src['type'] = 'mp4 (direct)' if '.mp4' in direct_url.lower() else 'hls (direct)'
            return src

        resolved_sources = await asyncio.gather(*(enrich(dict(s)) for s in sources))
        return list(resolved_sources)

    # Optional hooks that Doronime supported before
    async def search(self, query: str) -> list[dict]:
        import urllib.parse
        client = self._t.get_client()
        search_url = f"{BASE}/?s={urllib.parse.quote_plus(query)}"
        res = await client.get(search_url, headers=self._headers)
        return self._p.parse_search_results(res.text)

    async def get_latest_updates(self) -> list[dict]:
        client = self._t.get_client()
        res = await client.get(BASE, headers=self._headers)
        return self._p.parse_latest_updates(res.text)
