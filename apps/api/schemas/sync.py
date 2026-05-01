from pydantic import BaseModel


class SyncEpisodePayload(BaseModel):
    slug: str
    episode: float
    tg_urls: list[str] | None = None
