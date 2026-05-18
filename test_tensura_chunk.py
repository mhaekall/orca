import requests
token = "8661115912:AAEc1VN4dhI7Zh3PlVHmiwZrR2uwm-WHCOU"
fileId = "BQACAgUAAyEGAATc0SFaAAI-Amnp_iLWpuNty9Q4XsNYjNDk4qzpAAL8HwACr41RV2MXd9qXwH3POwQ"
res = requests.get(f"https://api.telegram.org/bot{token}/getFile?file_id={fileId}")
print(res.json())
