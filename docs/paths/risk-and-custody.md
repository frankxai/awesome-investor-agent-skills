# Path: Risk And Custody

Goal: define the safety questions every investor or crypto workflow must answer before it graduates from research to private operation.

## Questions

- Does the tool require secrets?
- Can it place orders?
- Can it transfer assets?
- Can it sign wallet transactions?
- Can it leak private portfolio data?
- Can a prompt injection alter the output?
- Does it fail closed?
- Is there a human approval gate?

## Required Controls

- Read-only keys wherever possible.
- No secrets in repo.
- No real wallet material in prompts.
- Paper trading by default.
- Audit log for every proposed action.
- Human gate for all live-money workflows.
- Separate private OS repo for any sensitive implementation.
