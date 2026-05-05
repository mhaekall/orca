import os
import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class TelegramNotifier:
    """
    Centralized Notification Router for ChatOps & Alerting.
    Supports Topic-Based Routing using different Bot Tokens and Chat IDs.
    
    Default Topics:
    - default: General logs (Fallback to TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID)
    - report: User reports (Video broken, errors) -> TG_BOT_REPORT & TG_CHAT_REPORT
    - infra: Infrastructure alerts (Redis, DB, Workers) -> TG_BOT_INFRA & TG_CHAT_INFRA
    - triage: Ingestion pipeline errors (HuggingFace, Swarm) -> TG_BOT_TRIAGE & TG_CHAT_TRIAGE
    - billing: Payments & Donations -> TG_BOT_BILLING & TG_CHAT_BILLING
    """

    @classmethod
    def _get_credentials(cls, topic: str) -> tuple[Optional[str], Optional[str]]:
        topic = topic.upper()
        
        # Override specific topic
        bot_token = os.getenv(f"TG_BOT_{topic}")
        chat_id = os.getenv(f"TG_CHAT_{topic}")
        
        # Fallback to default if topic specific is not set
        if not bot_token or not chat_id:
            bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
            chat_id = os.getenv("TELEGRAM_CHAT_ID")
            
        return bot_token, chat_id

    @classmethod
    async def send(cls, topic: str, message: str, reply_markup: Optional[Dict[str, Any]] = None) -> bool:
        bot_token, chat_id = cls._get_credentials(topic)

        if not bot_token or not chat_id:
            logger.warning(f"[Notifier] Telegram credentials missing for topic '{topic}' and default fallback.")
            return False

        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "HTML" # Default HTML, fallback logic can be added if Markdown is needed
        }
        
        if reply_markup:
            payload["reply_markup"] = reply_markup

        # Use shared async client configuration for better performance
        limits = httpx.Limits(max_keepalive_connections=10, max_connections=20)
        timeout = httpx.Timeout(15.0)
        
        async with httpx.AsyncClient(limits=limits, timeout=timeout) as client:
            try:
                res = await client.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json=payload
                )
                
                if res.status_code != 200:
                    logger.error(f"[Notifier] Failed to send to {topic}. HTTP {res.status_code}: {res.text}")
                    
                    # Markdown parsing error fallback
                    if res.status_code == 400 and "parse" in res.text.lower():
                        # Try without parse_mode if it fails due to unclosed tags
                        payload.pop("parse_mode", None)
                        retry_res = await client.post(
                            f"https://api.telegram.org/bot{bot_token}/sendMessage",
                            json=payload
                        )
                        return retry_res.status_code == 200
                        
                    return False
                return True
            except Exception as e:
                logger.error(f"[Notifier] Exception sending alert [{topic}]: {repr(e)}")
                return False
