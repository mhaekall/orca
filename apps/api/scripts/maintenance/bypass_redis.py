import re


def bypass_logs(file_path):
    with open(file_path) as f:
        content = f.read()

    # Bypass _debug in telegram.py
    content = re.sub(
        r'async def _debug\(msg\):.*?except:\s+pass',
        r'async def _debug(msg):\n            pass',
        content,
        flags=re.DOTALL
    )

    # Bypass _debug_log in telegram.py
    content = re.sub(
        r'async def _debug_log\(msg\):.*?except:\s+pass',
        r'async def _debug_log(msg):\n            pass',
        content,
        flags=re.DOTALL
    )

    # Bypass _log_to_redis in main.py
    content = re.sub(
        r'async def _log_to_redis\(msg: str\):.*?except Exception:\s+pass',
        r'async def _log_to_redis(msg: str):\n                print(msg)\n                await _send_telegram_alert(msg)',
        content,
        flags=re.DOTALL
    )

    with open(file_path, "w") as f:
        f.write(content)

bypass_logs("../../services/ingestion/uploader/telegram.py")
bypass_logs("../../services/ingestion/main.py")
print("Done modifying services/ingestion files.")
