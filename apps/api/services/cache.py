import asyncio
import json
import time

from services.clients import client
from services.config import UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL

_local_cache = {}


async def upstash_get(key: str):
    try:
        url = f"{UPSTASH_REDIS_REST_URL}/get/{key}"
        res = await client.get(url, headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"})
        data = res.json()

        if "error" in data:
            return _local_cache.get(key)

        result = data.get("result")
        if result is not None:
            try:
                return json.loads(result)
            except Exception:
                return result

        return _local_cache.get(key)
    except Exception as e:
        print(f"[Upstash] Get exception for {key}: {e}")
        return _local_cache.get(key)


async def upstash_keys(pattern: str):
    try:
        url = f"{UPSTASH_REDIS_REST_URL}/keys/{pattern}"
        res = await client.get(url, headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"})
        data = res.json()
        return data.get("result", [])
    except Exception as e:
        print(f"[Upstash] Keys error: {e}")
        return []


async def upstash_set(key: str, value: dict, ex: int = 3600, nx: bool = False):
    try:
        payload = json.dumps(value)
        command = ["SET", key, payload, "EX", str(ex)]
        if nx:
            command.append("NX")
        res = await client.post(
            UPSTASH_REDIS_REST_URL,
            headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"},
            json=command,
        )
        data = res.json()
        if "error" in data:
            if "max requests limit exceeded" in data["error"].lower():
                if nx and key in _local_cache:
                    return False
                _local_cache[key] = value
                return True
            print(f"[Upstash] Set error response: {data['error']}")
            return False
        result = data.get("result")
        return result == "OK"
    except Exception:
        if nx and key in _local_cache:
            return False
        _local_cache[key] = value
        return True


def upstash_del(key: str):
    _local_cache.pop(key, None)
    return client.post(
        f"{UPSTASH_REDIS_REST_URL}/del/{key}",
        headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"},
    )


async def swr_cache_get(key: str, fetch_fn, ttl: int = 3600, swr: int = 86400):
    cached = await upstash_get(key)
    now = int(time.time())

    if cached and isinstance(cached, dict) and "stale_at" in cached:
        stale_at = cached.get("stale_at", 0)
        expires_at = cached.get("expires_at", 0)

        if now < stale_at:
            return cached["data"]

        if now < expires_at:
            asyncio.create_task(swr_cache_refresh(key, fetch_fn, ttl, swr))
            return cached["data"]
    elif cached and not isinstance(cached, dict):
        return cached
    elif cached and "data" not in cached:
        return cached

    data = await fetch_fn()
    if data:
        payload = {"data": data, "stale_at": now + ttl, "expires_at": now + swr, "created_at": now}
        await upstash_set(key, payload, ex=swr)
    return data


async def swr_cache_refresh(key: str, fetch_fn, ttl: int, swr: int):
    try:
        data = await fetch_fn()
        if data:
            now = int(time.time())
            payload = {
                "data": data,
                "stale_at": now + ttl,
                "expires_at": now + swr,
                "created_at": now,
            }
            await upstash_set(key, payload, ex=swr)
    except Exception as e:
        print(f"[SWR] Background refresh error for {key}: {e}")


import hashlib


def _slug_hash(provider_id: str, slug: str) -> str:
    return hashlib.sha256(f"{provider_id}:{slug}".encode()).hexdigest()[:16]


async def get_reconciler_cache(provider_id: str, slug: str) -> dict | None:
    key = f"recon:{provider_id}:{_slug_hash(provider_id, slug)}"
    return await upstash_get(key)


async def set_reconciler_cache(provider_id: str, slug: str, result: dict) -> None:
    key = f"recon:{provider_id}:{_slug_hash(provider_id, slug)}"
    await upstash_set(key, result, ex=604800)
