# Contributing

Keep this repo curated and source-backed.

## Good Additions

- Public GitHub projects with active maintenance.
- Official docs for finance, trading, research, or crypto infrastructure.
- Research-only or simulation-friendly tools.
- Clear risk labels for anything that touches orders, wallets, exchanges, or brokerage APIs.

## Bad Additions

- Signal-selling links.
- Closed-source referral pages.
- Unsourced performance claims.
- Live strategy instructions.
- Wallet or account material.

## Required Fields

Every catalog entry in `data/repos.json` needs:

- `name`
- `url`
- `category`
- `assetClass`
- `integrationUse`
- `executionRisk`
- `privacyRisk`
- `whyIncluded`
- `notFor`
- `reviewedAt`

Run:

```powershell
./scripts/validate-catalog.ps1
```
