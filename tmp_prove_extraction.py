import asyncio
import sys
import os

# Ensure paths are correct for imports
sys.path.append(os.path.join(os.path.dirname(__file__), "apps", "api"))
sys.path.append(os.path.join(os.path.dirname(__file__), "services", "scraper"))

from services.transport import ProviderTransport
from providers.otakudesu.provider import OtakudesuProvider
from providers.doronime.provider import DoronimeProvider
from providers.oploverz.provider import OploverzProvider

async def test_provider(name, provider, search_query):
    print(f"\n--- Testing {name} ---")
    try:
        search_res = []
        if hasattr(provider, 'search'):
            search_res = await provider.search(search_query)
            
        if not search_res and hasattr(provider, 'get_latest_updates'):
            search_res = await provider.get_latest_updates()
            
        if not search_res:
            print(f"No results found for {name}.")
            return
            
        anime_url = search_res[0]['url']
        print(f"Target Anime: {anime_url}")
        
        detail = await provider.get_anime_detail(anime_url)
        if not detail.get('episodes'):
            print("No episodes found.")
            return
            
        ep_url = detail['episodes'][0]['url']
        print(f"Target Episode: {ep_url}")
        
        sources = await provider.get_episode_sources(ep_url)
        
        direct_sources = [s for s in sources if '(direct)' in s.get('type', '') or s.get('type') == 'direct']
        
        if direct_sources:
            print(f"✅ Ditemukan {len(direct_sources)} Direct Stream MP4/HLS:")
            for s in direct_sources:
                url_short = s['url'] if len(s['url']) < 150 else s['url'][:150] + '...'
                print(f"  [{s.get('quality', 'Unknown')}] {s.get('provider')} -> {url_short}")
        else:
            print("❌ Gagal mendapatkan Direct Stream. Raw sources:")
            for s in sources:
                print(f"  - {s.get('type')} | {s.get('url')}")
    except Exception as e:
        print(f"Error on {name}: {e}")

async def main():
    transport = ProviderTransport()
    
    # Otakudesu test with a known anime
    o_prov = OtakudesuProvider(transport)
    print("\n--- Testing Otakudesu ---")
    try:
        ep_url = "https://otakudesu.blog/episode/snwbe-episode-5-sub-indo/"
        print(f"Target Episode: {ep_url}")
        sources = await o_prov.get_episode_sources(ep_url)
        direct_sources = [s for s in sources if '(direct)' in s.get('type', '') or s.get('type') == 'direct']
        if direct_sources:
            print(f"✅ Ditemukan {len(direct_sources)} Direct Stream MP4/HLS:")
            for s in direct_sources:
                url_short = s['url'] if len(s['url']) < 150 else s['url'][:150] + '...'
                print(f"  [{s.get('quality', 'Unknown')}] {s.get('provider')} -> {url_short}")
        else:
             print("❌ Gagal mendapatkan Direct Stream. Raw sources:", sources)
    except Exception as e:
        print("Error Otakudesu:", e)

    # Doronime test
    d_prov = DoronimeProvider(transport)
    print("\n--- Testing Doronime ---")
    try:
        ep_url = "https://doronime.id/anime/dr-batu-sains-masa-depan/episode-29"
        print(f"Target Episode: {ep_url}")
        sources = await d_prov.get_episode_sources(ep_url)
        direct_sources = [s for s in sources if '(direct)' in s.get('type', '') or s.get('type') == 'direct']
        if direct_sources:
            print(f"✅ Ditemukan {len(direct_sources)} Direct Stream MP4/HLS:")
            for s in direct_sources:
                url_short = s['url'] if len(s['url']) < 150 else s['url'][:150] + '...'
                print(f"  [{s.get('quality', 'Unknown')}] {s.get('provider')} -> {url_short}")
        else:
             print("❌ Gagal mendapatkan Direct Stream. Raw sources:", sources)
    except Exception as e:
        print("Error Doronime:", e)

if __name__ == "__main__":
    asyncio.run(main())