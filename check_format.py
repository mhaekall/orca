import requests
token = "8079034038:AAFH_etbN7YavCF4iw5j3luy5wxWjjYdqsY"
fileId = "BQACAgUAAyEGAATc0SFaAAEBOgNp-0ilQqfN8JJcrlemYOQsag161wACeTAAAthL4FdNfPyEIqqx6zsE"
res = requests.get(f"https://api.telegram.org/bot{token}/getFile?file_id={fileId}")
data = res.json()
file_path = data["result"]["file_path"]
url = f"https://api.telegram.org/file/bot{token}/{file_path}"
res2 = requests.get(url, stream=True)
chunk = res2.raw.read(100)
print(chunk[:100])
