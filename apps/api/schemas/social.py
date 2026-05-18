from pydantic import BaseModel


class WatchProgressUpdate(BaseModel):
    user_id: str
    anilistId: str
    episodeNumber: float
    progressSeconds: int
    durationSeconds: int
    isCompleted: bool


class WatchEventCreate(BaseModel):
    user_id: str
    anilistId: str
    episodeNumber: float
    event_type: str  # "start", "progress", "complete"
    timestamp_sec: int


class EpisodeLikeCreate(BaseModel):
    user_id: str
    anilistId: str
    episodeNumber: float


class WatchSessionUpdate(BaseModel):
    user_id: str
    anilist_id: int
    episode_number: float
    watch_duration_sec: int
    total_duration_sec: int
    quality_watched: str = "Auto"
    provider_used: str | None = None


class ReportCreate(BaseModel):
    user_id: str
    anilist_id: int
    episode_number: float
    issue_type: str
    video_url: str | None = None
    player_error: str | None = None
