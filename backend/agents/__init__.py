"""Agent factory: pick mock (scripted/heuristic) or LLM-backed agents.

Selection order:
    GUARDIAN_AGENTS=mock   force the zero-key scripted demo
    GUARDIAN_AGENTS=llm    require an API key (error if none configured)
    unset / auto           LLM if OPENAI_API_KEY or ANTHROPIC_API_KEY is set,
                           otherwise mock
"""

from __future__ import annotations

import os

from .judge import HeuristicJudge, LLMJudge
from .llm import LLMClient
from .worker import DEMO_SCRIPT, LLMWorker, ScriptedWorker

__all__ = ["DEMO_SCRIPT", "ScriptedWorker", "LLMWorker",
           "HeuristicJudge", "LLMJudge", "build_agents"]


def build_agents(policy=None):
    """Returns (worker, judge, mode_label). Call once per run — workers are stateful."""
    mode = os.getenv("GUARDIAN_AGENTS", "auto").lower()
    client = None if mode == "mock" else LLMClient.from_env()

    if mode == "llm" and client is None:
        raise RuntimeError(
            "GUARDIAN_AGENTS=llm but no OPENAI_API_KEY / ANTHROPIC_API_KEY is set "
            "(put one in .env at the repo root)"
        )

    if client is None:
        return ScriptedWorker(), HeuristicJudge(), "mock (scripted worker + heuristic judge)"

    label = f"llm ({client.provider}:{client.model})"
    return LLMWorker(client), LLMJudge(client), label
