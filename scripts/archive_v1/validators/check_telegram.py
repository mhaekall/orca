import requests

token = "8661115912:AAEc1VN4dhI7Zh3PlVHmiwZrR2uwm-WHCOU"
fileId = "BQACAgUAAyEGAATc0SFaAAEBcb9qAAGDmsojiExko-TvbqMKSmQlZr8AAkgfAAItFAABVNnt-vv9rrpcOwQ"
res = requests.get(f"https://api.telegram.org/bot{token}/getFile?file_id={fileId}")
data = res.json()
if not data.get("ok"):
    print("Error:", data)
else:
    file_path = data["result"]["file_path"]
    target_url = f"https://api.telegram.org/file/bot{token}/{file_path}"
    head_res = requests.head(target_url)
    print("Content-Type:", head_res.headers.get("Content-Type"))
    print("Content-Length:", head_res.headers.get("Content-Length"))
