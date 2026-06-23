# Path: Trading Systems

Goal: map research and simulation frameworks without enabling live trading in public workflows.

## Research And Backtesting Seeds

- [Qlib](https://github.com/microsoft/qlib)
- [QuantConnect Lean](https://github.com/QuantConnect/Lean)
- [NautilusTrader](https://github.com/nautechsystems/nautilus_trader)
- [vectorbt](https://github.com/polakowo/vectorbt)
- [backtesting.py](https://github.com/kernc/backtesting.py)
- [bt](https://github.com/pmorissette/bt)
- [zipline-reloaded](https://github.com/stefan-jansen/zipline-reloaded)

## Autonomy Boundary

Public workflows stop at:

- historical data research
- backtests
- paper simulations
- strategy memos
- risk reviews

Anything that can create or route a real order belongs in a private, human-gated execution design.
