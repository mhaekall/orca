import requests
token = "8661115912:AAEc1VN4dhI7Zh3PlVHmiwZrR2uwm-WHCOU"
fileId = "BQACAgUAAyEGAATc0SFaAAKoaGn0rdziJuQaYtI1x1fHrZ0xRl6AAAKsKAACMyupV_AZJ97CH5etOwQ"
res = requests.get(f"https://api.telegram.org/bot{token}/getFile?file_id={fileId}")
data = res.json()
file_path = data["result"]["file_path"]
url = f"https://api.telegram.org/file/bot{token}/{file_path}"
res2 = requests.get(url)
print(res2.text[:500])
