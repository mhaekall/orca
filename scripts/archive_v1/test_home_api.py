import asyncio
import httpx

async def main():
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.get("http://localhost:8000/api/v2/manga/home")
        data = res.json()
        print("Trending:", [m["cleanTitle"] for m in data.get("data", {}).get("trending", [])])
        print("Popular:", [m["cleanTitle"] for m in data.get("data", {}).get("popular", [])])

asyncio.run(main())