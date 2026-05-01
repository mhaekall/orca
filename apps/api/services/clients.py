import httpx

from services.config import HEADERS
from utils.ssrf_guard import SSRFSafeTransport

client = httpx.AsyncClient(verify=True, headers=HEADERS, timeout=30.0, follow_redirects=True)
scraping_client = httpx.AsyncClient(
    verify=True,
    headers=HEADERS,
    timeout=30.0,
    follow_redirects=False,
    transport=SSRFSafeTransport(),
)
