import hashlib
import math
import re
from typing import Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field, model_validator

EMBEDDING_DIMENSIONS = 128
EmbeddingSource = Literal["deterministic_hashing"]


class EmbeddingResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model_id: str
    source: EmbeddingSource
    dimensions: int = Field(default=EMBEDDING_DIMENSIONS, ge=1)
    vector: list[float]
    text_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")

    @model_validator(mode="after")
    def validate_vector(self) -> "EmbeddingResult":
        if len(self.vector) != self.dimensions:
            raise ValueError("vector length must match dimensions")
        if not all(math.isfinite(value) for value in self.vector):
            raise ValueError("vector values must be finite")
        return self


class EmbeddingProvider(Protocol):
    def embed(self, text: str) -> EmbeddingResult:
        """Return a versioned vector without exposing the source text."""


class DeterministicEmbeddingProvider:
    model_id = "hashing-embedding-v1"
    source: EmbeddingSource = "deterministic_hashing"

    def __init__(self, dimensions: int = EMBEDDING_DIMENSIONS) -> None:
        if dimensions < 1:
            raise ValueError("dimensions must be positive")
        self.dimensions = dimensions

    def embed(self, text: str) -> EmbeddingResult:
        normalized = _normalize_text(text)
        if not normalized:
            raise ValueError("text must not be blank")

        vector = [0.0] * self.dimensions
        tokens = re.findall(r"[a-z0-9]+", normalized)
        weighted_tokens = list(tokens)
        weighted_tokens.extend(
            f"{left}_{right}" for left, right in zip(tokens, tokens[1:])
        )
        for token in weighted_tokens:
            digest = hashlib.blake2b(token.encode(), digest_size=8).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimensions
            sign = 1.0 if digest[4] & 1 else -1.0
            weight = 0.5 if "_" in token else 1.0
            vector[index] += sign * weight

        magnitude = math.sqrt(sum(value * value for value in vector))
        if magnitude == 0:
            raise ValueError("text did not produce an embedding")
        vector = [value / magnitude for value in vector]
        return EmbeddingResult(
            model_id=self.model_id,
            source=self.source,
            dimensions=self.dimensions,
            vector=vector,
            text_sha256=hashlib.sha256(normalized.encode()).hexdigest(),
        )


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def cosine_similarity(
    left: EmbeddingResult, right: EmbeddingResult
) -> float:
    if left.dimensions != right.dimensions:
        raise ValueError("embeddings must have matching dimensions")
    return max(
        -1.0,
        min(
            1.0,
            sum(
                left_value * right_value
                for left_value, right_value in zip(left.vector, right.vector)
            ),
        ),
    )