import asyncio

import httpx

url = "https://powerful-crow-69427.upstash.io"
token = "gQAAAAAAAQ8zAAIgcDIzNzIxOWVjNDZhMGE0MzU1ODQ0ZmNhOGE0Mzg1OTI3ZA"


async def main():
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{url}/get/test", headers={"Authorization": f"Bearer {token}"})
        print(res.json())


asyncio.run(main())
