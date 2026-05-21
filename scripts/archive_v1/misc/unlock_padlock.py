import httpx
import os
import asyncio
from dotenv import load_dotenv

load_dotenv("apps/api/.env")

tokens = []
for k, v in os.environ.items():
    if k.startswith("TELEGRAM_BOT_TOKEN") and v:
        tokens.append(v)

async def test_token(token, file_id):
    url = f"https://api.telegram.org/bot{token}/getFile?file_id={file_id}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return token
    except:
        pass
    return None

async def main():
    print(f"Loaded {len(tokens)} bot tokens from .env")
    
    file_ids = [
        "BQACAgUAAyEGAATc0SFaAAJFW2nsFQsNrHhcuV3cU3pBEhM5csntAALoHQACVBhhV0TiwHTNt5QfOwQ", # Ep 7
        "BQACAgUAAyEGAATc0SFaAAJIQGnsIqS9ESoTaXIvEqtV3qcOxgUmAALxIAACVBhhVzQ5PlaLEFddOwQ", # Ep 3
        "BQACAgUAAyEGAATc0SFaAAIIQ2nfotvDAAHADQhBpVmrroL2KeyysgACkh8AAryo-FZlf_lFVrsTCTsE", # Ep 5
        "BQACAgUAAyEGAATc0SFaAAIJMmngM0QbBmvPr6PehcL93UJwJrxgAAI-HwACvKgAAVeCqPycupJ_9jsE", # Ep 6
        "BQACAgUAAyEGAATc0SFaAAJKtWnsKacTW4dcT-RkSxRPXW1haDlOAAJ3IwACVBhhVynjd2Z9vWnEOwQ"  # Ep 2
    ]
    
    for fid in file_ids:
        print(f"Testing File ID: {fid}")
        tasks = [test_token(t, fid) for t in tokens]
        results = await asyncio.gather(*tasks)
        
        valid = [r for r in results if r]
        if valid:
            print(f"  -> SUCCESS! The padlock is opened with token: {valid[0]}")
        else:
            print("  -> FAILED! None of the tokens match this file_id.")

if __name__ == "__main__":
    asyncio.run(main())
