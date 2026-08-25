import math

import pytest

from services.ai.app.embeddings import (
    DeterministicEmbeddingProvider,
    EmbeddingResult,
    cosine_similarity,
)


def test_embedding_is_reproducible_and_unit_normalized() -> None:
    provider = DeterministicEmbeddingProvider()

    first = provider.embed("Refund has not arrived after cancellation.")
    second = provider.embed("  REFUND has not arrived after cancellation. ")

    assert first == second
    assert first.model_id == "hashing-embedding-v1"
    assert first.source == "deterministic_hashing"
    assert first.dimensions == 128
    assert len(first.vector) == 128
    assert math.isclose(math.sqrt(sum(value * value for value in first.vector)), 1.0)
    assert len(first.text_sha256) == 64


def test_related_text_has_similarity_and_different_fingerprints() -> None:
    provider = DeterministicEmbeddingProvider()
    refund = provider.embed("Refund has not arrived after cancellation.")
    similar_refund = provider.embed("Refund not received after order cancellation.")
    delivery = provider.embed("The delivery arrived damaged.")

    assert cosine_similarity(refund, similar_refund) > 0
    assert refund.text_sha256 != similar_refund.text_sha256
    assert refund.text_sha256 != delivery.text_sha256


def test_rejects_blank_text_and_incompatible_dimensions() -> None:
    provider = DeterministicEmbeddingProvider()

    with pytest.raises(ValueError, match="text must not be blank"):
        provider.embed("   ")

    left = provider.embed("refund")
    right = DeterministicEmbeddingProvider(dimensions=64).embed("refund")
    with pytest.raises(ValueError, match="matching dimensions"):
        cosine_similarity(left, right)


def test_embedding_contract_rejects_wrong_vector_length() -> None:
    with pytest.raises(ValueError, match="vector length must match dimensions"):
        EmbeddingResult(
            model_id="test",
            source="deterministic_hashing",
            dimensions=2,
            vector=[1.0],
            text_sha256="0" * 64,
        )