# Repository Instructions

This repo is part of the FrankX / Starlight / Arcanea agent estate.

## Classification

- Repo: `awesome-investor-agent-skills`
- Class: content-or-program, public-safe research catalog
- Default health command: `node scripts/validate-catalog.mjs` (portable, runs in CI); `./scripts/validate-catalog.ps1` remains for Windows
- Tests: `node --test "scripts/*.test.mjs"` (offline)
- Remote target: `https://github.com/frankxai/awesome-investor-agent-skills`

## Agent Rules

- Read this file before making changes.
- Preserve existing user work and unrelated dirty files.
- Keep edits scoped to public-safe investor research catalogs, paths, docs, and skills.
- Prefer primary sources and active projects.
- Avoid private paths, private strategy, account data, wallet material, seed phrases, API keys, and unsourced rankings.
- Do not make financial, investment, legal, tax, accounting, securities, or compliance claims.
- Label execution-adjacent projects clearly.
- Treat trading bots and crypto tools as research and simulation references unless a human explicitly approves a separate private execution design.
- Run the health command before handoff when feasible.
- The weekly harvest only proposes. Never edit `data/repos.json` from harvest output without reading each candidate's LICENSE and README; SPDX detection is a hint, and keyword-based execution risk is a default, not a judgement.
- Never copy code from AGPL, GPL, unlicensed or custom-licence projects into another repository.

## Handoff

Summarize changed files, validation run, source gaps, risks, and follow-up.
