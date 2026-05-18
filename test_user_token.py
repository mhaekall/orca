import requests

token = "8782570865:AAFlGrid6H-XFPu-jAbE26dHD_DgXHhRBpE"
fileId = "BQACAgUAAyEGAATc0SFaAAJWVmns5JXSi-1blI6cp982dkOPgbHpAAIkKgACVBhpV66elKLvt-mJOwQ"

res = requests.get(f"https://api.telegram.org/bot{token}/getFile?file_id={fileId}")
data = res.json()
if data.get("ok"):
    print(f"✅ Token Berhasil! File path: {data['result']['file_path']}")
else:
    print(f"❌ Token Gagal: {data}")
