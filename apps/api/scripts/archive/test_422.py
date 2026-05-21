import asyncio
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

response = client.post(
    "/api/v2/comments",
    json={
        "user_id": "test_user_id",
        "anilistId": "12345",
        "episodeNumber": 1,
        "text": "This is a test comment",
        "timestamp_sec": 0,
        "parent_id": None
    }
)
print("Status:", response.status_code)
print("Response:", response.json())
