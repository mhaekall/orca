import asyncio
import httpx

async def main():
    m3u8_url = "https://tele-proxy.moehamadhkl.workers.dev/stream/bot8640932204:AAEzRhYIrbfRsfsI62aaQcWr-39xO7t1VX0/BQACAgUAAyEGAATc0SFaAAEBcC9qAAF7CvfssivBAAFR7Scy9x3EyBlvAAKhHQACLRQAAVSB4KJUPFe3fTsE.m3u8"
    
    async with httpx.AsyncClient() as client:
        res = await client.get(m3u8_url, headers={"User-Agent": "Mozilla/5.0"})
        if res.status_code != 200:
            print("Failed to fetch m3u8")
            return
            
        urls = [line.strip() for line in res.text.split("\n") if line.startswith("http")]
        print(f"Testing {len(urls)} chunks...")
        
        async def check_url(url):
            try:
                r = await client.head(url, headers={"User-Agent": "Mozilla/5.0"})
                if r.status_code != 200:
                    print(f"Error {r.status_code}: {url}")
                    return False
                return True
            except:
                print(f"Exception for {url}")
                return False
                
        tasks = [check_url(u) for u in urls]
        results = await asyncio.gather(*tasks)
        
        failed = sum(1 for r in results if not r)
        print(f"Done. Failed chunks: {failed}")

asyncio.run(main())