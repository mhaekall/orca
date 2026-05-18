import urllib.parse
import requests

url = "https://tele-proxy.moehamadhkl.workers.dev/stream/bot8695324788:AAF_HhPMgGudh_a6WDWZnb1rKwrPZGMuUtA/BQACAgUAAyEGAATc0SFaAAEBSnNp_BDtAVp9mtj_XmLxY1g5NrKgGQACQiMAAqU34Vcwja1z7KhZ6DsE?mime=ts"

# OkHttp encodes the path. Let's see what happens if we encode the ':' in the path.
parts = urllib.parse.urlparse(url)
encoded_path = parts.path.replace(':', '%3A')
encoded_url = urllib.parse.urlunparse(parts._replace(path=encoded_path))

print(f"Requesting: {encoded_url}")
res = requests.head(encoded_url)
print(f"Status: {res.status_code}")
