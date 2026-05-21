import requests

fileId = "BQACAgUAAyEGAATc0SFaAAJWVmns5JXSi-1blI6cp982dkOPgbHpAAIkKgACVBhpV66elKLvt-mJOwQ"
tokens = [
    "8630179591:AAHZkd9feJu9Bp8hZ1pCYrQBNvC_3vueJ5I",
    "8743346873:AAEUONWv2fRkfgHNxr361_cCscwHDsH4ONI",
    "8778300055:AAFWl0NnNM25iVlzccMHCL6sHSlW8xLdgGo"
]

found = False
for token in tokens:
    res = requests.get(f"https://api.telegram.org/bot{token}/getFile?file_id={fileId}")
    data = res.json()
    if data.get("ok"):
        print(f"✅ BINGO! Token berhasil: {token}")
        found = True
        break
    else:
        print(f"❌ Gagal untuk {token[:10]}...")

if not found:
    print("Ketiga token masih gagal membuka file_id tersebut.")
