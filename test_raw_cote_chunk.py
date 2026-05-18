import requests
token = "8079034038:AAFH_etbN7YavCF4iw5j3luy5wxWjjYdqsY"
fileId = "BQACAgUAAyEGAATc0SFaAAEBOedp-0hG1ti9En7yWZXkHUcvzd3rrAACXDAAAthL4FdKaS41kE4GrjsE"
res = requests.get(f"https://api.telegram.org/bot{token}/getFile?file_id={fileId}")
data = res.json()
file_path = data["result"]["file_path"]
url = f"https://api.telegram.org/file/bot{token}/{file_path}"
res2 = requests.head(url)
print("Content-Type:", res2.headers.get("Content-Type"))
print("Content-Length:", res2.headers.get("Content-Length"))
