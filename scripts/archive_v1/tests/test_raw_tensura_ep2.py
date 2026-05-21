import requests
token = "8782570865:AAFlGrid6H-XFPu-jAbE26dHD_DgXHhRBpE"
fileId = "BQACAgUAAyEGAATc0SFaAAIN3WnhjJlEWUwEEZy_IcRhGo6SSj5lAAIvIQACvKgIVytHfT7iP0_FOwQ"
res = requests.get(f"https://api.telegram.org/bot{token}/getFile?file_id={fileId}")
data = res.json()
if not data.get("ok"):
    print("Error:", data)
else:
    file_path = data["result"]["file_path"]
    url = f"https://api.telegram.org/file/bot{token}/{file_path}"
    res2 = requests.get(url)
    print("Status:", res2.status_code)
    print("Content-Length:", res2.headers.get("Content-Length"))
    print(res2.text[:500])
