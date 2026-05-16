import redis.asyncio as redis
from app.core.config import settings

# Shared Redis client for async operations (Signaling Pub/Sub, Caching)
redis_client = redis.from_url(settings.redis_url, decode_responses=True)
