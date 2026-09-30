import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { validate } from "./validate-catalog.mjs";

const entry = (over = {}) => ({
  name: "Repo", url: "https://github.com/o/repo", category: "backtesting", assetClass: "equities", integrationUse: "x",
  executionRisk: "simulation", privacyRisk: "low", whyIncluded: "y", notFor: "z", reviewedAt: "2026-09-30", stars: 10, ...over,
});

function fixture({ repos = [entry()], candidates, md = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), "catalog-"));
  mkdirSync(join(root, "data"), { recursive: true });
  writeFileSync(join(root, "data/repos.json"), JSON.stringify({ repos }));
  if (candidates) writeFileSync(join(root, "data/candidates.json"), JSON.stringify(candidates));
  for (const [name, body] of Object.entries(md)) writeFileSync(join(root, name), body);
  return root;
}

test("a valid catalogue passes", () => {
  assert.deepEqual(validate({ root: fixture({ candidates: { version: 1, items: { "https://github.com/o/x": { status: "new" } } } }) }), []);
});

test("each kind of catalogue mistake is reported", () => {
  const cases = [
    [entry({ whyIncluded: "  " }), /blank field whyIncluded/],
    [entry({ notFor: undefined }), /missing field notFor/],
    [entry({ url: "https://gitlab.com/o/r" }), /GitHub repository URL/],
    [entry({ executionRisk: "safe" }), /executionRisk/],
    [entry({ privacyRisk: "none" }), /privacyRisk/],
    [entry({ reviewedAt: "yesterday" }), /YYYY-MM-DD/],
    [entry({ stars: "many" }), /stars must be an integer/],
  ];
  for (const [bad, pattern] of cases) {
    const errors = validate({ root: fixture({ repos: [JSON.parse(JSON.stringify(bad))] }) });
    assert.ok(errors.some((e) => pattern.test(e)), `${pattern}: ${errors.join(" | ")}`);
  }
});

test("duplicate urls are reported regardless of case and trailing slash", () => {
  const errors = validate({ root: fixture({ repos: [entry(), entry({ name: "Again", url: "https://github.com/O/Repo/" })] }) });
  assert.ok(errors.some((e) => /duplicate url/.test(e)));
});

test("candidate state: bad status, upper-case keys and accepted-but-missing are reported", () => {
  const errors = validate({ root: fixture({ candidates: { version: 1, items: { "https://github.com/O/A": { status: "new" }, "https://github.com/o/b": { status: "maybe" }, "https://github.com/o/c": { status: "accepted" } } } }) });
  assert.ok(errors.some((e) => /must be lowercase/.test(e)));
  assert.ok(errors.some((e) => /status "maybe"/.test(e)));
  assert.ok(errors.some((e) => /accepted but not in data\/repos.json/.test(e)));
});

test("public-safety phrases fail the check in any markdown file", () => {
  const errors = validate({ root: fixture({ md: { "README.md": "This has GUARANTEED RETURNS and you should buy it" } }) });
  assert.ok(errors.some((e) => /guaranteed return/.test(e)));
  assert.ok(errors.some((e) => /you should buy/.test(e)));
});

test("the real catalogue in this repository validates", () => {
  assert.deepEqual(validate(), []);
});
