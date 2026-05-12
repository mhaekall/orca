import asyncio
import os

import httpx
from dotenv import load_dotenv

load_dotenv()


async def test_telegram():
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")

    print(f"Token exists: {bool(bot_token)}")
    print(f"Chat ID exists: {bool(chat_id)}")

    if not bot_token or not chat_id:
        print("Missing credentials")
        return

    message = "🚨 <b>TESTING REPORT INTEGRATION</b> 🚨\n\nThis is a test message to verify the Lapor feature."

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {"chat_id": chat_id, "text": message, "parse_mode": "HTML"}

    print(f"Sending to URL: {url}")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            print(f"Response Status: {response.status_code}")
            print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(test_telegram())
