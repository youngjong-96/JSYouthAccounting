"""Small, dependency-free helpers for API performance measurements.

The timings deliberately contain only route names, durations, status codes, and
response sizes.  They never include access tokens, IDs, or response data.
"""

from __future__ import annotations

from contextlib import contextmanager, nullcontext
import json
import os
from time import perf_counter
from uuid import uuid4


PERFORMANCE_LOG_ENABLED = os.environ.get("PERFORMANCE_LOGGING", "").lower() in {
    "1",
    "true",
    "yes",
    "on",
}


class RequestTimer:
    """Collect named server-side durations for one HTTP request."""

    def __init__(self, route: str):
        self.route = route
        self.request_id = uuid4().hex[:12]
        self.started_at = perf_counter()
        self.timings: list[tuple[str, float]] = []

    @contextmanager
    def measure(self, name: str):
        started_at = perf_counter()
        try:
            yield
        finally:
            self.timings.append((name, (perf_counter() - started_at) * 1000))

    def start(self) -> float:
        """Return a start point for a duration that spans existing code blocks."""
        return perf_counter()

    def stop(self, name: str, started_at: float) -> None:
        self.timings.append((name, (perf_counter() - started_at) * 1000))

    def add_total(self) -> None:
        if not any(name == "total" for name, _duration in self.timings):
            self.timings.append(("total", (perf_counter() - self.started_at) * 1000))

    def server_timing_header(self) -> str:
        self.add_total()
        return ", ".join(
            f"{name};dur={duration:.1f}"
            for name, duration in self.timings
        )

    def log(self, *, status: int, response_bytes: int) -> None:
        """Emit a compact JSON log only when PERFORMANCE_LOGGING is enabled."""
        if not PERFORMANCE_LOG_ENABLED:
            return

        self.add_total()
        print(json.dumps({
            "event": "api_performance",
            "request_id": self.request_id,
            "route": self.route,
            "status": status,
            "response_bytes": response_bytes,
            "timings_ms": {
                name: round(duration, 1)
                for name, duration in self.timings
            },
        }, ensure_ascii=False))


def measure_request(timer: RequestTimer | None, name: str):
    """Return a timing context when a request timer is available."""
    return timer.measure(name) if timer else nullcontext()
