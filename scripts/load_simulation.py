import argparse
import json
import random
import time
from collections import deque
from dataclasses import asdict, dataclass

WORKLOAD_TIERS = (100, 1_000, 10_000, 100_000)
ISSUE_TEMPLATES = (
    "refund pending after order cancellation",
    "delivery arrived damaged",
    "warranty service was declined",
    "unexpected charge on checkout",
)
SECTORS = ("e_commerce", "consumer_durables", "digital_services", "telecom")


@dataclass(frozen=True, slots=True)
class SimulationMetrics:
    event_count: int
    worker_count: int
    accepted_count: int
    processed_count: int
    peak_queue_depth: int
    producer_ms: float
    processing_ms: float
    throughput_per_second: float
    queue_drained: bool
    worker_distribution: tuple[int, ...]


def generate_synthetic_events(
    event_count: int, seed: int = 7
) -> list[dict[str, object]]:
    if event_count < 1:
        raise ValueError("event_count must be positive")
    generator = random.Random(seed)
    return [
        {
            "event_id": f"synthetic-{index:06d}",
            "issue": generator.choice(ISSUE_TEMPLATES),
            "sector": generator.choice(SECTORS),
        }
        for index in range(event_count)
    ]


def run_load_simulation(
    event_count: int, worker_count: int = 4, seed: int = 7
) -> SimulationMetrics:
    if worker_count < 1:
        raise ValueError("worker_count must be positive")

    producer_started = time.perf_counter()
    events = generate_synthetic_events(event_count, seed)
    queue = deque(events)
    producer_ms = (time.perf_counter() - producer_started) * 1000
    worker_distribution = [0] * worker_count
    processing_started = time.perf_counter()
    worker_index = 0
    while queue:
        event = queue.popleft()
        _process_event(event)
        worker_distribution[worker_index] += 1
        worker_index = (worker_index + 1) % worker_count
    processing_ms = (time.perf_counter() - processing_started) * 1000
    throughput = event_count / (processing_ms / 1000) if processing_ms else 0.0
    return SimulationMetrics(
        event_count=event_count,
        worker_count=worker_count,
        accepted_count=len(events),
        processed_count=sum(worker_distribution),
        peak_queue_depth=len(events),
        producer_ms=round(producer_ms, 3),
        processing_ms=round(processing_ms, 3),
        throughput_per_second=round(throughput, 2),
        queue_drained=not queue,
        worker_distribution=tuple(worker_distribution),
    )


def _process_event(event: dict[str, object]) -> None:
    if not event.get("event_id") or not event.get("issue") or not event.get("sector"):
        raise ValueError("synthetic event is incomplete")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run synthetic queue workload simulation"
    )
    parser.add_argument("--events", nargs="+", type=int, default=WORKLOAD_TIERS)
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()
    results = [
        asdict(run_load_simulation(count, args.workers)) for count in args.events
    ]
    if any(
        result["accepted_count"] != result["event_count"]
        or result["processed_count"] != result["event_count"]
        or not result["queue_drained"]
        or sum(result["worker_distribution"]) != result["event_count"]
        for result in results
    ):
        raise SystemExit("load simulation failed its queue-drain or accounting checks")
    print(json.dumps({"synthetic": True, "results": results}, indent=2))


if __name__ == "__main__":
    main()