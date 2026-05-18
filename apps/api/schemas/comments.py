from pydantic import BaseModel


class CommentCreate(BaseModel):
    user_id: str
    anilistId: str
    episodeNumber: float
    text: str
    parent_id: int | None = None
    is_spoiler: bool = False
    timestamp_sec: int | None = None


class CommentReaction(BaseModel):
    user_id: str
    comment_id: int
    emoji: str  # e.g., "like", "love", "laugh"
