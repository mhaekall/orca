import re
import os

file_path = "../../services/ingestion/main.py"
with open(file_path, "r") as f:
    content = f.read()

# Replace the tg_proxy usage with api.telegram.org in _send_telegram_alert
content = re.sub(
    r'tg_proxy = os\.getenv\("TG_PROXY_BASE_URL", "https://api\.telegram\.org"\)\s*await client\.post\(\s*f"\{tg_proxy\}/bot\{bot_token\}/sendMessage"',
    r'await client.post(\n                            f"https://api.telegram.org/bot{bot_token}/sendMessage"',
    content,
)

with open(file_path, "w") as f:
    f.write(content)

file_path_2 = "services/queue.py"
with open(file_path_2, "r") as f:
    content2 = f.read()

content2 = re.sub(
    r'except Exception as e:\s+print\(f"\[Queue\] Native batch ingest error: \{e\}"\)',
    r"""except Exception as e:
                import traceback
                import httpx
                err_msg = f"<b>[HF SPACE CRASH]</b> Queue native worker failed:\n<pre>{traceback.format_exc()}</pre>"
                try:
                    import asyncio
                    async def send_err():
                        async with httpx.AsyncClient(timeout=10.0) as c:
                            await c.post(
                                "https://api.telegram.org/botYOUR_BOT_TOKEN/sendMessage",
                                json={"chat_id": "1558640518", "text": err_msg[:4000], "parse_mode": "HTML"}
                            )
                    asyncio.create_task(send_err())
                except:
                    pass
                print(f"[Queue] Native batch ingest error: {e}")""",
    content2,
    flags=re.DOTALL,
)
with open(file_path_2, "w") as f:
    f.write(content2)

print("Patch applied")
