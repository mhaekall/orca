import requests
import re
import sys

def test_file_id(fileId):
    with open("apps/api/.env", "r") as f:
        content = f.read()

    tokens = re.findall(r'TELEGRAM_BOT_TOKEN_?\d*="([^"]+)"', content)

    for token in tokens:
        res = requests.get(f"https://api.telegram.org/bot{token}/getFile?file_id={fileId}")
        if res.json().get("ok"):
            print(f"✅ Token Found for {fileId[:15]}...: {token}")
            return
    print(f"❌ Failed to find token for {fileId[:15]}...")

test_file_id("BQACAgUAAyEGAATc0SFaAAJWS2ns5FtTdvMi_WdyKOXWlMwLI0oXAAIXKgACVBhpVyCUx4YLpvJjOwQ") # tg-proxy-1
test_file_id("BQACAgUAAyEGAATc0SFaAAJVkGns4Hg9iKl2-NH9hKA88XpkA9rzAAJXKQACVBhpV073a_ETTO5AOwQ") # tg-proxy-2
test_file_id("BQACAgUAAyEGAATc0SFaAAJWJWns48b0SFmUhI-WTs5U5CCTFDt_AALwKQACVBhpVxbla0OvYjRmOwQ") # tg-proxy
