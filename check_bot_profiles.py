import requests
import re

with open("apps/api/.env", "r") as f:
    content = f.read()

tokens = re.findall(r'TELEGRAM_BOT_TOKEN_?\d*="([^"]+)"', content)

print(f"Ditemukan {len(tokens)} token di .env. Memeriksa profil bot...\n")

for i, token in enumerate(tokens):
    try:
        res = requests.get(f"https://api.telegram.org/bot{token}/getMe", timeout=5)
        data = res.json()
        if data.get("ok"):
            bot = data["result"]
            print(f"{i+1}. ID: {bot['id']} | Username: @{bot['username']} | Name: {bot['first_name']}")
        else:
            print(f"{i+1}. ❌ Token {token[:10]}... Invalid/Banned")
    except Exception as e:
        print(f"{i+1}. ❌ Gagal cek token {token[:10]}... Error: {e}")
