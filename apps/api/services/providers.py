import time

from services.scraper.providers.doronime import DoronimeProvider
from services.scraper.providers.kuronime.provider import KuronimeProvider
from services.scraper.providers.oploverz import OploverzProvider
from services.scraper.providers.otakudesu import OtakudesuProvider
from services.scraper.providers.samehadaku import SamehadakuProvider
from services.transport import ProviderTransport
from utils.circuit_breaker import CircuitBreaker, CircuitBreakerOpenException
from utils.extractor import UniversalExtractor

try:
    from services.health_metrics import record_provider_health
except ImportError:
    pass


class ProviderCircuitBreakerProxy:
    def __init__(self, provider, name):
        self.provider = provider
        self.name = name
        self.cb = CircuitBreaker(name=name, failure_threshold=3, cooldown_seconds=300)

    async def get_anime_detail(self, *args, **kwargs):
        start_time = time.time()
        try:
            result = await self.cb.call(self.provider.get_anime_detail, *args, **kwargs)
            try:
                await record_provider_health(self.name, True, (time.time() - start_time) * 1000)
            except Exception:
                pass
            return result
        except CircuitBreakerOpenException as e:
            print(f"[{self.name}] {e}")
            try:
                await record_provider_health(self.name, False, 0.0)
            except Exception:
                pass
            return None
        except Exception as e:
            print(f"[{self.name}] Request failed: {e}")
            try:
                await record_provider_health(self.name, False, (time.time() - start_time) * 1000)
            except Exception:
                pass
            raise e

    async def get_episode_sources(self, *args, **kwargs):
        start_time = time.time()
        try:
            result = await self.cb.call(self.provider.get_episode_sources, *args, **kwargs)
            try:
                await record_provider_health(self.name, True, (time.time() - start_time) * 1000)
            except Exception:
                pass
            return result
        except CircuitBreakerOpenException as e:
            print(f"[{self.name}] {e}")
            try:
                await record_provider_health(self.name, False, 0.0)
            except Exception:
                pass
            return []
        except Exception as e:
            print(f"[{self.name}] Request failed: {e}")
            try:
                await record_provider_health(self.name, False, (time.time() - start_time) * 1000)
            except Exception:
                pass
            raise e

    # Pass through other attributes (like client for older providers)
    def __getattr__(self, name):
        return getattr(self.provider, name)


shared_transport = ProviderTransport()

oploverz_provider = ProviderCircuitBreakerProxy(
    OploverzProvider(transport=shared_transport), "oploverz"
)
otakudesu_provider = ProviderCircuitBreakerProxy(
    OtakudesuProvider(transport=shared_transport), "otakudesu"
)
doronime_provider = ProviderCircuitBreakerProxy(
    DoronimeProvider(transport=shared_transport), "doronime"
)
samehadaku_provider = ProviderCircuitBreakerProxy(
    SamehadakuProvider(transport=shared_transport), "samehadaku"
)
kuronime_provider = ProviderCircuitBreakerProxy(
    KuronimeProvider(transport=shared_transport), "kuronime"
)
extractor = UniversalExtractor()
