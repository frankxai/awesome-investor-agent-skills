# Selection Matrix

Score each repo before adding it to a path.

| Dimension | What To Check |
| --- | --- |
| Source | Is the repo official or widely recognized? |
| Maintenance | Was it pushed recently, and are issues/PRs active? |
| License | Is the license clear enough for the intended use? |
| Maturity | Is it a toy, research prototype, or production-grade engine? |
| Data posture | Does it require sensitive keys or private data? |
| Execution posture | Can it place orders, move assets, or sign transactions? |
| Agent fit | Can an agent use it through docs, APIs, CLI, Python, MCP, or JSON outputs? |
| Governance fit | Can the workflow fail closed and escalate to humans? |

## Inclusion Tiers

- `core`: first-wave source for Agentic Wealth OS design.
- `candidate`: promising but needs deeper review.
- `watch`: useful to track, not integrate.
- `reference`: discovery list, paper, or concept source.

## First-Wave Core

- OpenBB for the OSS financial terminal/data layer.
- TradingAgents and ai-hedge-fund for multi-agent finance research patterns.
- Qlib, Lean, NautilusTrader, vectorbt, and QuantStats for quant research and simulation.
- CCXT, Freqtrade, and Hummingbot for crypto infrastructure mapping, not live deployment.
- FinGPT and FinRobot for finance-specific LLM/agent references.
