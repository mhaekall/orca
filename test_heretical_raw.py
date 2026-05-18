import requests

token = "7745690828:AAH3AS4ruQkNHLUp2osiVy_riIAAi4SrXB8"
fileId = "BQACAgUAAyEGAATc0SFaAAJWVmns5JXSi-1blI6cp982dkOPgbHpAAIkKgACVBhpV66elKLvt-mJOwQ"

res = requests.get(f"https://api.telegram.org/bot{token}/getFile?file_id={fileId}")
data = res.json()
if data.get("ok"):
    file_path = data['result']['file_path']
    print(f"File Path: {file_path}")
    url = f"https://api.telegram.org/file/bot{token}/{file_path}"
    res2 = requests.get(url, stream=True)
    print("Status:", res2.status_code)
    print("Headers:", res2.headers)
    print("Preview:", res2.raw.read(100))
else:
    print(f"❌ Gagal: {data}")
