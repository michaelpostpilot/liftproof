from __future__ import annotations

import json
import logging
from typing import AsyncGenerator

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the LiftProof AI Copilot — a friendly, expert assistant for geo-testing and marketing incrementality measurement.

## Your Role
You help marketers design, run, and interpret geo-holdout experiments. You explain complex statistical concepts in plain English, proactively suggest improvements, and guide users step by step.

## LiftProof Methodology
LiftProof uses three causal inference methods, then ensembles them:

1. **Synthetic Control Method (SCM)**: Builds a weighted combination of control geos that best matches the treatment group's pre-period behavior. The gap between actual and synthetic during the treatment period = causal lift.

2. **Augmented SCM**: Adds a ridge regression bias-correction on top of SCM to reduce bias when the pre-period fit isn't perfect.

3. **Difference-in-Differences (DiD)**: Compares the before/after change in treatment geos vs. control geos. More robust when there are parallel trends but levels differ.

4. **Ensemble**: Weights the three models by inverse pre-period RMSE, so better-fitting models get more influence.

5. **Fisher Permutation Inference**: Randomly reassigns which geos are "treatment" 200 times, re-runs the ensemble each time, and builds a null distribution. The p-value = fraction of placebo effects >= the real effect. This gives exact p-values without distributional assumptions.

## Key Concepts to Explain Simply
- **Lift %**: How much more the treatment geos produced vs. what would have happened without the campaign
- **p-value**: Probability that this result could happen by random chance. Below 0.05 = statistically significant.
- **Confidence Interval**: The range the true lift likely falls in (95% of the time)
- **MDE (Minimum Detectable Effect)**: Smallest lift % the test can reliably detect. Lower = more sensitive.
- **Pre-period fit**: How well the synthetic control matches treatment geos BEFORE the campaign. Good fit = trustworthy results.
- **Weekly CV (Coefficient of Variation)**: How noisy the data is week to week. Lower CV = cleaner signal = easier to detect effects.
- **iROAS**: Incremental Return on Ad Spend. Revenue lift / ad spend. Above 1.0x = profitable.
- **CPIA**: Cost Per Incremental Acquisition. Ad spend / incremental conversions.

## Experiment Design Guidance
- **Treatment geos**: Should be 15-30% of total geos. Too many = weak control group. Too few = noisy measurement.
- **Control geos**: The rest. More controls = better synthetic fit.
- **Pre-period**: At least 4-8 weeks before treatment. Longer is better for model training.
- **Treatment period**: Duration the campaign ran. Longer = more data = more power to detect effects.
- **Geo granularity**: States (50 geos, clean data) vs DMAs (210 geos, more power but noisier).
- Use the "Recommend Split" feature to let LiftProof optimize the treatment/control assignment.

## Power & Test Design
- Power = probability of detecting a real effect if one exists. Target: 80%+.
- More geos, longer duration, lower CV, and larger true effect all increase power.
- If underpowered: run longer, use more geos, or accept you can only detect larger effects.

## Tone & Style
- Be concise: short paragraphs, bullet points when helpful
- Use plain English first, then the technical term in parentheses
- Be encouraging but honest — if a test design is weak, say so with specific suggestions
- Never make up numbers or results
- When you don't know something specific to the user's data, say so and suggest what to check

## Context
You may receive context about the user's current page, experiment configuration, and results. Use this to give specific, relevant guidance rather than generic advice."""


class CopilotService:
    """Streams chat responses from Claude API via Anthropic Messages API."""

    def __init__(self):
        self.api_key = settings.ANTHROPIC_API_KEY
        self.model = "claude-sonnet-4-20250514"
        self.max_tokens = 1024

    async def stream_chat(
        self,
        messages: list[dict],
        context: dict | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream a chat response as SSE events.

        messages: List of {"role": "user"|"assistant", "content": "..."}
        context: Optional dict with current experiment/page state
        """
        if not self.api_key:
            yield self._sse_event("error", {"message": "Anthropic API key not configured"})
            return

        # Build system prompt with optional context
        system = SYSTEM_PROMPT
        if context:
            system += "\n\n## Current Context\n"
            if context.get("page"):
                system += f"- User is on the **{context['page']}** page\n"
            if context.get("experiment"):
                exp = context["experiment"]
                system += f"- Experiment: {exp.get('name', 'Untitled')}\n"
                system += f"- Status: {exp.get('status', 'unknown')}\n"
                system += f"- KPI: {exp.get('primary_kpi', 'N/A')}\n"
                system += f"- Treatment geos: {exp.get('treatment_geos', [])}\n"
                system += f"- Control geos: {exp.get('control_geos', [])}\n"
                system += f"- Pre-period: {exp.get('pre_period_start', '?')} to {exp.get('pre_period_end', '?')}\n"
                system += f"- Treatment period: {exp.get('treatment_start', '?')} to {exp.get('treatment_end', '?')}\n"
                system += f"- Geo granularity: {exp.get('geo_granularity', 'N/A')}\n"
            if context.get("results"):
                res = context["results"]
                system += f"- Lift: {res.get('lift_percent')}%\n"
                system += f"- p-value: {res.get('p_value')}\n"
                system += f"- CI: [{res.get('ci_lower')}, {res.get('ci_upper')}]\n"
                system += f"- Pre-period RMSE: {res.get('pre_period_fit_rmse')}\n"
                if res.get("iroas"):
                    system += f"- iROAS: {res['iroas']}\n"
                if res.get("model_weights"):
                    system += f"- Model weights: {res['model_weights']}\n"
            if context.get("design_quality"):
                dq = context["design_quality"]
                system += f"- Design quality: {dq}\n"

        # Call Claude Messages API with streaming
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
        }

        body = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "system": system,
            "messages": messages,
            "stream": True,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    "https://api.anthropic.com/v1/messages",
                    headers=headers,
                    json=body,
                ) as response:
                    if response.status_code != 200:
                        error_body = await response.aread()
                        logger.error("Claude API error %s: %s", response.status_code, error_body)
                        yield self._sse_event("error", {
                            "message": f"AI service error ({response.status_code})"
                        })
                        return

                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            event_type = data.get("type", "")

                            if event_type == "content_block_delta":
                                delta = data.get("delta", {})
                                if delta.get("type") == "text_delta":
                                    text = delta.get("text", "")
                                    if text:
                                        yield self._sse_event("text", {"text": text})

                            elif event_type == "message_stop":
                                yield self._sse_event("done", {})

                        except json.JSONDecodeError:
                            continue

        except httpx.TimeoutException:
            yield self._sse_event("error", {"message": "AI response timed out"})
        except Exception as e:
            logger.error("Copilot stream error: %s", e)
            yield self._sse_event("error", {"message": "AI service unavailable"})

    @staticmethod
    def _sse_event(event: str, data: dict) -> str:
        return f"data: {json.dumps({'event': event, 'data': data})}\n\n"
