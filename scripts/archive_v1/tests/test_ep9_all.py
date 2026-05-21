import requests
import re

fileId = "BQACAgUAAyEGAATc0SFaAAJfLGntMJP91zoPbGk1Oxc54KpE_dnWAAInMwACVBhpV6cHJj1yF6JmOwQ"

with open("apps/api/.env", "r") as f:
    content = f.read()

tokens = re.findall(r'TELEGRAM_BOT_TOKEN_?\d*="([^"]+)"', content)

for token in tokens:
    res = requests.get(f"https://api.telegram.org/bot{token}/getFile?file_id={fileId}")
    data = res.json()
    if data.get("ok"):
        print(f"✅ Token Found! {token}")
        break
    else:
        print(f"❌ Failed for {token[:10]}...")
