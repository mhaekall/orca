import requests
token1 = "8079034038:AAFH_etbN7YavCF4iw5j3luy5wxWjjYdqsY"
token2 = "7328759161:AAGhAbS5jy9HWt7qHJnPAZsuCIOmTyDtKw0"
fileId = "BQACAgUAAyEGAATc0SFaAAIN3WnhjJlEWUwEEZy_IcRhGo6SSj5lAAIvIQACvKgIVytHfT7iP0_FOwQ"

res1 = requests.get(f"https://api.telegram.org/bot{token1}/getFile?file_id={fileId}")
print("Token 1 (Mobile):", res1.json())

res2 = requests.get(f"https://api.telegram.org/bot{token2}/getFile?file_id={fileId}")
print("Token 2 (Web):", res2.json())
