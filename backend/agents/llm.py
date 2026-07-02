"""Minimal provider-agnostic LLM client.

One method — `complete(system, user) -> str` — is all the worker and judge need,
so supporting a provider is ~10 lines. Provider is picked from the environment:

    OPENAI_API_KEY     -> OpenAI    (model: OPENAI_MODEL, default gpt-4o-mini)
    ANTHROPIC_API_KEY  -> Anthropic (model: ANTHROPIC_MODEL, default claude-sonnet-4-6)
    neither            -> None      (callers fall back to the mock agents)

Set GUARDIAN_AGENTS=mock to force the scripted demo even with a key present.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# .env lives at the repo root, next to .env.example.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")


class LLMClient:
    def __init__(self, provider: str, model: str):
        self.provider = provider
        self.model = model
        if provider == "openai":
            from openai import OpenAI
            self._client = OpenAI()
        elif provider == "anthropic":
            from anthropic import Anthropic
            self._client = Anthropic()
        else:
            raise ValueError(f"unknown provider: {provider}")

    @classmethod
    def from_env(cls) -> Optional["LLMClient"]:
        if os.getenv("OPENAI_API_KEY"):
            return cls("openai", os.getenv("OPENAI_MODEL", "gpt-4o-mini"))
        if os.getenv("ANTHROPIC_API_KEY"):
            return cls("anthropic", os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6"))
        return None

    def complete(self, system: str, user: str, max_tokens: int = 500) -> str:
        if self.provider == "openai":
            resp = self._client.chat.completions.create(
                model=self.model,
                max_tokens=max_tokens,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            )
            return resp.choices[0].message.content or ""

        resp = self._client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return resp.content[0].text
