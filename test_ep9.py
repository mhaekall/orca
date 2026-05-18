import requests

token = "7745690828:AAH3AS4ruQkNHLUp2osiVy_riIAAi4SrXB8"
fileId = "BQACAgUAAyEGAATc0SFaAAJfLGntMJP91zoPbGk1Oxc54KpE_dnWAAInMwACVBhpV6cHJj1yF6JmOwQ"

res = requests.get(f"https://api.telegram.org/bot{token}/getFile?file_id={fileId}")
print(res.json())
