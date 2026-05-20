import os

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter()


class AppConfigResponse(BaseModel):
    # Dynamic Proxy Resolver
    active_tele_proxy: str

    # Kill Switch / Update mechanism
    min_supported_version: str
    latest_version: str
    update_url: str

    # Feature Flags
    maintenance_mode: bool
    maintenance_message: str | None = None

    # Dynamic Scraper Config
    scraper_rules: Dict[str, Any]


@router.get("/v2/config/app", response_model=AppConfigResponse, tags=["Mobile Config"])
async def get_app_config():
    """
    Returns the dynamic configuration for the mobile app (APK).
    Used to dynamically route video proxies and enforce OTA or mandatory updates.
    """
    return AppConfigResponse(
        # Proxy URL. Can be fetched from DB or ENV, defaults to the current worker.
        active_tele_proxy=os.getenv(
            "ACTIVE_TELE_PROXY_URL", "https://tele-proxy.mhaekall.workers.dev"
        ),
        # Versioning. If app version is lower than min_supported_version, it must force an update.
        min_supported_version="1.0.0",
        latest_version="1.0.0",
        update_url="https://orcanime.pages.dev",
        # Emergency maintenance switch
        maintenance_mode=False,
        maintenance_message=None,
        # Scraper Rules Config
        scraper_rules={
            "kuronime": {
                "domain": "https://kuronime.sbs",
                "apiUrl": "https://animeku.org/api/v9/sources",
                "decryptKey": "3&!Z0M,VIZ;dZW==",
                "reqIdRegex": "var\\s+[a-zA-Z0-9_]+\\s*=\\s*[\"']([^\"']{100,})[\"']"
            },
            "samehadaku": {
                "domain": "https://v2.samehadaku.how",
                "serverSelector": ".server_option li",
                "ajaxEndpoint": "/wp-admin/admin-ajax.php",
                "iframeSrcRegex": "src=[\"']([^\"']+)[\"']"
            }
        }
    )

class TelemetryError(BaseModel):
    provider: str
    url: str
    error_message: str
    device_info: str | None = None

@router.post("/v2/telemetry/scraper-error", tags=["Telemetry"])
async def report_scraper_error(error: TelemetryError):
    """
    Client-side scraping telemetry. 
    Mobile app reports here if a scraper rule fails, indicating DOM might have changed.
    """
    print(f"[TELEMETRY] Scraper Error on {error.provider}: {error.error_message} (URL: {error.url})")
    
    # Optional: Send to Telegram Admin Bot if needed
    bot_token = os.getenv("TG_BOT_TOKEN")
    if bot_token:
        import httpx
        import asyncio
        async def send_tg():
            try:
                msg = f"⚠️ <b>Scraper Broken on Client!</b>\nProvider: {error.provider}\nURL: {error.url}\nError: {error.error_message}"
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"https://api.telegram.org/bot{bot_token}/sendMessage",
                        json={"chat_id": "1558640518", "text": msg, "parse_mode": "HTML"}
                    )
            except Exception:
                pass
        asyncio.create_task(send_tg())
        
    return {"status": "reported"}
