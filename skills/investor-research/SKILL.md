---
name: investor-research
description: Use when mapping public investor, quant, trading, crypto, or financial AI repositories for research-only agent workflows.
---

# Investor Research

Use this skill to turn public financial tooling into a source-backed research map.

## Inputs

1. Public GitHub repos and official docs.
2. `data/repos.json`.
3. Path docs under `docs/paths/`.

## Rules

- Treat all outputs as research organization, not advice.
- Cite sources and evidence dates.
- Classify execution and privacy risk.
- Stop at research, memo, backtest, and simulation outputs unless working inside a separate private, human-gated system.
- Never store secrets, private positions, wallet material, or account data.

## Output Shape

Return:

- objective
- source set
- category map
- tool fit
- execution risk
- privacy risk
- missing evidence
- human approval gate
- next research action
