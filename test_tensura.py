import requests
token = "8661115912:AAEc1VN4dhI7Zh3PlVHmiwZrR2uwm-WHCOU"
fileId = "BQACAgUAAyEGAATc0SFaAAKoaGn0rdziJuQaYtI1x1fHrZ0xRl6AAAKsKAACMyupV_AZJ97CH5etOwQ"
res = requests.get(f"https://api.telegram.org/bot{token}/getFile?file_id={fileId}")
print(res.json())
