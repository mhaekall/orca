import asyncio
import httpx

async def test():
    try:
        url = "https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/social/report"
        payload = {"user_id": "test", "anilist_id": 1, "episode_number": 1, "issue_type": "test"}
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, json=payload)
            print("Status:", res.status_code)
            print("Response:", res.text)
    except Exception as e:
        print("Exception:", repr(e))

asyncio.run(test())