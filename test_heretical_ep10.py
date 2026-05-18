import requests
token = "7745690828:AAH3AS4ruQkNHLUp2osiVy_riIAAi4SrXB8"
fileId = "BQACAgUAAyEGAATc0SFaAAJgSmntOyu1LYigCEuBfoVFrshprLBTAAJHNAACVBhpVxjS0y0NNNziOwQ"
res = requests.get(f"https://api.telegram.org/bot{token}/getFile?file_id={fileId}")
data = res.json()
print("Telegram API response:", data)
