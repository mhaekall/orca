import requests
token = "8640932204:AAEzRhYIrbfRsfsI62aaQcWr-39xO7t1VX0"
fileId = "BQACAgUAAyEGAATc0SFaAAEBOVJp-0az1zqx6XTdmlU0vpINJW5CQAACuC8AAthL4Fc6TJdI86kp5TsE"
res = requests.get(f"https://api.telegram.org/bot{token}/getFile?file_id={fileId}")
data = res.json()
file_path = data["result"]["file_path"]
url = f"https://api.telegram.org/file/bot{token}/{file_path}"
res2 = requests.head(url)
print("Content-Length:", res2.headers.get("Content-Length"))
