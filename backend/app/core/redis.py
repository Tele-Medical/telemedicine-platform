import redis.asyncio as redis
from app.core.config import settings

kwargs = {"decode_responses": True}
if settings.redis_url.startswith("rediss://"):
    kwargs["ssl_cert_reqs"] = "none"

# Shared Redis client for async operations (Signaling Pub/Sub, Caching)
redis_client = redis.from_url(settings.redis_url, **kwargs)
