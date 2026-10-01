import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildResult, categoryOf, classifyLicence, executionRiskOf, isoWeek, normalise, renderReport, run, score, search } from "./harvest.mjs";

const NOW = Date.parse("2026-09-30T00:00:00Z");
const sources = {
  minStars: 25, maxAgeDays: 365,
  executionKeywords: ["trading bot", "live trading"],
  categoryRules: [{ category: "mcp-server", match: ["mcp"] }, { category: "backtesting", match: ["backtest"] }],
  queries: [{ id: "q1", type: "repositories", q: "x" }, { id: "q2", type: "repositories", q: "y" }],
};
const gh = (over) => ({ name: "r", full_name: "o/r", html_url: "https://github.com/o/r", description: "", stargazers_count: 100, forks_count: 1, license: { spdx_id: "MIT" }, pushed_at: "2026-09-20T00:00:00Z", archived: false, fork: false, topics: [], ...over });

test("licence classes: the traps are named, not hidden", () => {
  assert.equal(classifyLicence("MIT").class, "permissive");
  assert.equal(classifyLicence("Apache-2.0").class, "permissive");
  assert.equal(classifyLicence("LGPL-3.0").class, "weak-copyleft");
  assert.equal(classifyLicence("GPL-3.0").class, "strong-copyleft");
  assert.equal(classifyLicence("AGPL-3.0").class, "network-copyleft");
  assert.equal(classifyLicence("SSPL-1.0").class, "network-copyleft");
  assert.equal(classifyLicence("NOASSERTION").class, "verify");
  assert.equal(classifyLicence(null).class, "none");
  assert.match(classifyLicence(null).guidance, /Do not copy/);
  assert.match(classifyLicence("AGPL-3.0").guidance, /Never copy/);
  assert.equal(classifyLicence("Weird-1.0").class, "verify");
});

test("ISO week labels, including year boundaries", () => {
  assert.equal(isoWeek(new Date("2026-09-30T00:00:00Z")), "2026-W40");
  assert.equal(isoWeek(new Date("2025-12-29T00:00:00Z")), "2026-W01");
  assert.equal(isoWeek(new Date("2027-01-01T00:00:00Z")), "2026-W53");
});

test("execution risk and category come from text, and default to review", () => {
  const r = normalise(gh({ description: "An MCP server with a backtest engine", topics: [] }));
  assert.equal(categoryOf(r, sources.categoryRules), "mcp-server");
  assert.equal(executionRiskOf(r, sources.executionKeywords), "needs-review");
  assert.equal(executionRiskOf(normalise(gh({ description: "Crypto trading bot" })), sources.executionKeywords), "execution-adjacent");
  assert.equal(categoryOf(normalise(gh({ description: "nothing" })), sources.categoryRules), "uncategorised");
});

test("score rewards popularity, recency and permissive licences, and punishes no licence", () => {
  const base = normalise(gh());
  assert.ok(score(normalise(gh({ stargazers_count: 10000 })), NOW) > score(base, NOW));
  assert.ok(score(base, NOW) > score(normalise(gh({ pushed_at: "2026-01-01T00:00:00Z" })), NOW));
  assert.ok(score(base, NOW) > score(normalise(gh({ license: null })), NOW));
  assert.ok(score(base, NOW, 3) > score(base, NOW, 1), "found by several independent queries");
});

function hitsOf(items, queries = ["q1"]) {
  return new Map(items.map((i) => [i.full_name, { item: i, queries: new Set(queries) }]));
}

test("filters: archived, forks, low stars, stale and already-catalogued repos never become candidates", () => {
  const items = [
    gh({ full_name: "o/good", html_url: "https://github.com/o/good", name: "good" }),
    gh({ full_name: "o/arch", html_url: "https://github.com/o/arch", archived: true }),
    gh({ full_name: "o/fork", html_url: "https://github.com/o/fork", fork: true }),
    gh({ full_name: "o/low", html_url: "https://github.com/o/low", stargazers_count: 3 }),
    gh({ full_name: "o/old", html_url: "https://github.com/o/old", pushed_at: "2024-01-01T00:00:00Z" }),
    gh({ full_name: "o/known", html_url: "https://github.com/o/known" }),
  ];
  const r = buildResult({ hits: hitsOf(items), errors: [], catalog: [{ url: "https://github.com/O/known/", name: "known" }], state: { items: {} }, sources, now: NOW });
  assert.deepEqual(r.candidates.map((c) => c.fullName), ["o/good"]);
  assert.deepEqual(r.skipped, { archived: 1, fork: 1, lowStars: 1, stale: 1, alreadyCatalogued: 1 });
});

test("state: a candidate is 'new' once; later weeks keep its review status", () => {
  const items = [gh({ full_name: "o/a", html_url: "https://github.com/o/a" })];
  const first = buildResult({ hits: hitsOf(items), errors: [], catalog: [], state: { items: {} }, sources, now: NOW });
  assert.equal(first.newlySeen.length, 1);
  const reviewed = { items: { ...first.state.items } };
  reviewed.items["https://github.com/o/a"].status = "rejected";
  const second = buildResult({ hits: hitsOf(items), errors: [], catalog: [], state: reviewed, sources, now: NOW + 7 * 86_400_000 });
  assert.equal(second.newlySeen.length, 0);
  assert.equal(second.alreadyReviewed.length, 1);
  assert.equal(second.state.items["https://github.com/o/a"].status, "rejected");
});

test("pulse flags archived upstream, licence changes and big star moves on catalogued repos", () => {
  const items = [gh({ full_name: "o/c", html_url: "https://github.com/o/c", archived: true, license: { spdx_id: "AGPL-3.0" }, stargazers_count: 200 })];
  const catalog = [{ url: "https://github.com/o/c", name: "c", license: "MIT", stars: 100 }];
  const r = buildResult({ hits: hitsOf(items), errors: [], catalog, state: { items: {} }, sources, now: NOW });
  assert.equal(r.pulse.length, 1);
  assert.deepEqual(r.pulse[0].notes.map((n) => n.split(" ")[0]), ["archived", "licence", "stars"]);
});

test("search: rate limiting stops the run cleanly and keeps what it found", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    if (calls === 1) return { ok: true, status: 200, json: async () => ({ items: [gh()] }) };
    return { ok: false, status: 403, json: async () => ({}) };
  };
  const { hits, errors } = await search({ queries: sources.queries.concat([{ id: "q3", type: "repositories", q: "z" }]), fetchImpl, sleep: async () => {} });
  assert.equal(hits.size, 1);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /rate limited/);
  assert.equal(calls, 2, "no further calls after the limit");
});

test("search: code search resolves repositories once and records which queries found them", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    if (url.includes("/search/code")) return { ok: true, status: 200, json: async () => ({ items: [{ repository: { full_name: "o/r" } }, { repository: { full_name: "o/r" } }] }) };
    return { ok: true, status: 200, json: async () => gh() };
  };
  const { hits } = await search({ queries: [{ id: "skill-files", type: "code", q: "filename:SKILL.md investing" }], fetchImpl, sleep: async () => {} });
  assert.equal(hits.size, 1);
  assert.equal(urls.filter((u) => u.includes("/repos/o/r")).length, 1, "metadata fetched once per repo");
  assert.ok([...hits.values()][0].queries.has("skill-files"));
});

test("report: partial runs say so, and licence traps get their own section", () => {
  const items = [gh({ full_name: "o/agpl", html_url: "https://github.com/o/agpl", license: { spdx_id: "AGPL-3.0" } })];
  const result = buildResult({ hits: hitsOf(items), errors: ["q2: rate limited (403)"], catalog: [], state: { items: {} }, sources, now: NOW });
  const md = renderReport({ result, week: "2026-W40", date: "2026-09-30", queryCount: 2 });
  assert.match(md, /## Incomplete run/);
  assert.match(md, /## Licence traps/);
  assert.match(md, /o\/agpl\*\*: AGPL-3\.0\. Network copyleft/);
  assert.match(md, /not investment advice/i);
});

test("curated lists are reported as directories to mine, not as projects", () => {
  const items = [
    gh({ full_name: "o/awesome-quant", html_url: "https://github.com/o/awesome-quant", name: "awesome-quant" }),
    gh({ full_name: "o/quant-awesomeness", html_url: "https://github.com/o/quant-awesomeness", name: "quant-awesomeness" }),
  ];
  const result = buildResult({ hits: hitsOf(items), errors: [], catalog: [], state: { items: {} }, sources, now: NOW });
  assert.deepEqual(result.candidates.map((c) => [c.fullName, c.isDirectory]), [["o/awesome-quant", true], ["o/quant-awesomeness", false]]);
  const md = renderReport({ result, week: "2026-W40", date: "2026-09-30", queryCount: 1 });
  const dirs = md.split("## Directories to mine")[1].split("## Licence traps")[0];
  assert.match(dirs, /o\/awesome-quant/);
  assert.doesNotMatch(dirs, /quant-awesomeness/);
});

test("run: writes the report and state files, and dry-run writes nothing", async () => {
  const root = mkdtempSync(join(tmpdir(), "harvest-"));
  mkdirSync(join(root, "data"), { recursive: true });
  writeFileSync(join(root, "data/sources.json"), JSON.stringify({ ...sources, queries: [sources.queries[0]] }));
  writeFileSync(join(root, "data/repos.json"), JSON.stringify({ repos: [] }));
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ items: [gh()] }) });
  const dry = await run({ root, fetchImpl, sleep: async () => {}, date: new Date("2026-09-30T00:00:00Z"), dryRun: true });
  assert.equal(dry.result.newlySeen.length, 1);
  assert.throws(() => readFileSync(join(root, "reports/2026-W40.md")));
  await run({ root, fetchImpl, sleep: async () => {}, date: new Date("2026-09-30T00:00:00Z") });
  assert.match(readFileSync(join(root, "reports/2026-W40.md"), "utf8"), /# Weekly harvest 2026-W40/);
  assert.equal(JSON.parse(readFileSync(join(root, "data/candidates.json"), "utf8")).items["https://github.com/o/r"].status, "new");
});

test('metadata cannot inject report rows or HTML', () => {
  const item = gh({ full_name: 'o/<script>|bad\nrow', html_url: 'javascript:alert(1)', license: { spdx_id: '<script>|custom\nrow' } });
  const result = buildResult({ hits: hitsOf([item]), errors: ['<script>|bad\nrow'], catalog: [], state: { items: {} }, sources, now: NOW });
  const md = renderReport({ result, week: '2026-W40', date: '2026-10-01', queryCount: 1 });
  assert.ok(!md.includes('<script>')); assert.ok(!md.includes('javascript:'));
  assert.ok(md.includes('&lt;script&gt;'));
});
