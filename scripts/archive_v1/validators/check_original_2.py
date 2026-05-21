import requests
token = "7745690828:AAH3AS4ruQkNHLUp2osiVy_riIAAi4SrXB8"
fileId = "BQACAgUAAyEGAATc0SFaAAJWVmns5JXSi-1blI6cp982dkOPgbHpAAIkKgACVBhpV66elKLvt-mJOwQ"
res = requests.get(f"https://api.telegram.org/bot{token}/getFile?file_id={fileId}")
url = f"https://api.telegram.org/file/bot{token}/{res.json()['result']['file_path']}"
text = requests.get(url).text
lines = text.split("\n")
for i, line in enumerate(lines[:10]):
    print(f"{i}: {line}")
