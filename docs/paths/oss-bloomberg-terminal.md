# Path: OSS Bloomberg Terminal

Goal: identify the best open-source data terminal and research layer for Agentic Wealth OS.

## Primary Seed

- [OpenBB](https://github.com/OpenBB-finance/OpenBB)

Use OpenBB as the first candidate for:

- read-only financial data access
- analyst and quant workflows
- AI-agent data gathering
- local/private research notebooks
- possible MCP/API integration after security review

## Companion Sources

- [yfinance](https://github.com/ranaroussi/yfinance) for lightweight market data prototypes.
- [QuantStats](https://github.com/ranaroussi/quantstats) for portfolio analytics and reporting.

## Acceptance Criteria

- Runs without live trading keys.
- Supports source citations in generated memos.
- Keeps private portfolios and credentials out of public outputs.
- Works as a read-only data source before any private integration.
