import asyncio
import httpx

async def test():
    try:
        url = "https://api.telegram.org/bot12345:ABC/sendMessage"
        payload = {"chat_id": "123", "text": "test"}
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload)
            print("Status:", res.status_code)
            if res.status_code != 200:
                print("Error text:", res.text)
    except Exception as e:
        print("Exception:", str(e))
        print("Exception type:", type(e))

asyncio.run(test())