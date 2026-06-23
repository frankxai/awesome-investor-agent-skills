# Awesome Investor Agent Skills

A curated, public-safe research catalog for investor agents, quant research, trading simulation, crypto investor workflows, and OSS finance infrastructure.

This repo is not financial, investment, legal, tax, accounting, securities, or compliance advice. It exists to help agents organize sources, compare tooling, and build research workflows with human approval gates.

## Start Here

- [Selection Matrix](docs/selection-matrix.md)
- [Public Safety Rules](docs/public-safety.md)
- [OSS Bloomberg Terminal Path](docs/paths/oss-bloomberg-terminal.md)
- [Investor Research Path](docs/paths/investor-research.md)
- [Trading Systems Path](docs/paths/trading-systems.md)
- [Crypto Investor Path](docs/paths/crypto-investor.md)
- [Risk And Custody Path](docs/paths/risk-and-custody.md)
- [Catalog Data](data/repos.json)
- [Investor Research Skill](skills/investor-research/SKILL.md)

## Category Map

| Category | Primary seeds |
| --- | --- |
| OSS Bloomberg terminal | [OpenBB](https://github.com/OpenBB-finance/OpenBB) |
| AI finance agents | [TradingAgents](https://github.com/TauricResearch/TradingAgents), [ai-hedge-fund](https://github.com/virattt/ai-hedge-fund), [FinRobot](https://github.com/AI4Finance-Foundation/FinRobot) |
| Financial LLMs | [FinGPT](https://github.com/AI4Finance-Foundation/FinGPT) |
| AI quant research | [Qlib](https://github.com/microsoft/qlib), [FinRL](https://github.com/AI4Finance-Foundation/FinRL) |
| Algorithmic research engines | [Lean](https://github.com/QuantConnect/Lean), [NautilusTrader](https://github.com/nautechsystems/nautilus_trader), [vectorbt](https://github.com/polakowo/vectorbt), [backtesting.py](https://github.com/kernc/backtesting.py), [bt](https://github.com/pmorissette/bt), [zipline-reloaded](https://github.com/stefan-jansen/zipline-reloaded) |
| Crypto infrastructure | [CCXT](https://github.com/ccxt/ccxt), [Freqtrade](https://github.com/freqtrade/freqtrade), [Hummingbot](https://github.com/hummingbot/hummingbot), [OctoBot](https://github.com/Drakkar-Software/OctoBot), [Jesse](https://github.com/jesse-ai/jesse) |
| Portfolio analytics | [QuantStats](https://github.com/ranaroussi/quantstats) |

## Intended Use

Agents can use this repo to:

1. Build source-backed research maps.
2. Draft diligence and strategy memos.
3. Compare tools by maturity, license, privacy posture, and execution risk.
4. Design simulation and paper-trading workflows.
5. Escalate anything involving live orders, wallets, capital, legal, tax, or compliance review.

Agents must not use this repo to:

- Make investment decisions.
- Move money.
- Sign wallet transactions.
- Store secrets or private financial data.
- Promise returns.

## Validation

```powershell
./scripts/validate-catalog.ps1
```

## License

CC0 1.0 Universal. See [LICENSE](LICENSE).
