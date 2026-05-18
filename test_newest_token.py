import requests

token = "7745690828:AAH3AS4ruQkNHLUp2osiVy_riIAAi4SrXB8"
fileId = "BQACAgUAAyEGAATc0SFaAAJWVmns5JXSi-1blI6cp982dkOPgbHpAAIkKgACVBhpV66elKLvt-mJOwQ"

res = requests.get(f"https://api.telegram.org/bot{token}/getFile?file_id={fileId}")
data = res.json()
if data.get("ok"):
    print(f"✅ BINGO! Token berhasil: {token}")
    print(f"File Path: {data['result']['file_path']}")
else:
    print(f"❌ Gagal: {data}")
