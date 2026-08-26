import pytest

from scripts.load_simulation import run_load_simulation


def test_load_simulation_drains_queue_and_distributes_work() -> None:
    result = run_load_simulation(100_000, worker_count=4)

    assert result.accepted_count == 100_000
    assert result.processed_count == 100_000
    assert result.peak_queue_depth == 100_000
    assert result.queue_drained is True
    assert result.worker_distribution == (25_000, 25_000, 25_000, 25_000)
    assert result.throughput_per_second > 0


def test_load_simulation_rejects_invalid_configuration() -> None:
    with pytest.raises(ValueError, match="event_count"):
        run_load_simulation(0)
    with pytest.raises(ValueError, match="worker_count"):
        run_load_simulation(10, worker_count=0)