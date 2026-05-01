import os

from fastapi import APIRouter
from pydantic import BaseModel

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
    )
