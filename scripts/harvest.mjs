#!/usr/bin/env node
// Weekly harvest: find repositories worth reading, classify their licence, and write a report.
// It only PROPOSES. It never edits data/repos.json; a person or a reviewing agent decides what enters the catalog.
// Zero dependencies. Usage:
//   GITHUB_TOKEN=... node scripts/harvest.mjs [--dry-run] [--limit 25] [--date 2026-09-30]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DAY = 86_400_000;

const PERMISSIVE = new Set(["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "CC0-1.0", "Unlicense", "0BSD", "Zlib", "MIT-0"]);
const WEAK_COPYLEFT = /^(LGPL|MPL|EPL|CDDL)/;
const STRONG_COPYLEFT = /^(GPL|AGPL|SSPL|EUPL|OSL)/;

/** What we may do with a project's code, from its SPDX id. `NOASSERTION` and `null` are the traps. */
export function classifyLicence(spdx) {
  if (spdx === null || spdx === undefined || spdx === "") return { class: "none", guidance: "No licence: all rights reserved. Do not copy code; read and learn only." };
  if (spdx === "NOASSERTION" || spdx === "Other") return { class: "verify", guidance: "Custom or unrecognised licence. Read LICENSE before any use; may be source-available or have commercial limits." };
  if (PERMISSIVE.has(spdx)) return { class: "permissive", guidance: "May absorb with attribution recorded in NOTICE." };
  if (/^(AGPL|SSPL)/.test(spdx)) return { class: "network-copyleft", guidance: "Network copyleft. Study only, or run unmodified as a separate process. Never copy into a product." };
  if (WEAK_COPYLEFT.test(spdx)) return { class: "weak-copyleft", guidance: "Link or depend; copying files brings obligations. Review before absorbing." };
  if (STRONG_COPYLEFT.test(spdx)) return { class: "strong-copyleft", guidance: "Copyleft. Study only unless our project uses the same terms." };
  return { class: "verify", guidance: `Unrecognised SPDX id ${spdx}. Read LICENSE.` };
}

export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d - yearStart) / DAY + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function normalise(item) {
  return {
    name: item.name,
    fullName: item.full_name,
    url: item.html_url,
    description: item.description ?? "",
    stars: item.stargazers_count ?? 0,
    forks: item.forks_count ?? 0,
    licence: item.license?.spdx_id ?? null,
    pushedAt: item.pushed_at ?? null,
    archived: Boolean(item.archived),
    fork: Boolean(item.fork),
    topics: item.topics ?? [],
  };
}

export function executionRiskOf(repo, keywords) {
  const text = `${repo.name} ${repo.description} ${repo.topics.join(" ")}`.toLowerCase();
  return keywords.some((k) => text.includes(k)) ? "execution-adjacent" : "needs-review";
}

export function categoryOf(repo, rules) {
  const text = `${repo.name} ${repo.description} ${repo.topics.join(" ")}`.toLowerCase();
  return rules.find((r) => r.match.some((m) => text.includes(m)))?.category ?? "uncategorised";
}

export function score(repo, now, queryHits = 1) {
  const ageDays = repo.pushedAt ? (now - Date.parse(repo.pushedAt)) / DAY : 9999;
  let s = Math.log10(Math.max(repo.stars, 1)) * 2;
  s += ageDays <= 30 ? 2 : ageDays <= 90 ? 1 : 0;
  s += classifyLicence(repo.licence).class === "permissive" ? 1 : 0;
  s -= classifyLicence(repo.licence).class === "none" ? 2 : 0;
  s += Math.min(queryHits - 1, 3) * 0.5; // found by several independent queries
  return Math.round(s * 100) / 100;
}

/** Search GitHub. `fetchImpl` and `sleep` are injectable so tests run offline and instantly. */
export async function search({ queries, token, fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), perPage = 30 }) {
  const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "awesome-investor-agent-skills-harvest" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const hits = new Map(); // fullName -> { item, queries: Set }
  const errors = [];

  const get = async (url) => {
    const res = await fetchImpl(url, { headers });
    if (res.status === 403 || res.status === 429) throw Object.assign(new Error(`rate limited (${res.status})`), { rateLimited: true });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  };

  for (const q of queries) {
    try {
      if (q.type === "code") {
        const data = await get(`https://api.github.com/search/code?q=${encodeURIComponent(q.q)}&per_page=${perPage}`);
        for (const file of data.items ?? []) {
          const fullName = file.repository?.full_name;
          if (!fullName) continue;
          if (!hits.has(fullName)) {
            await sleep(1200);
            hits.set(fullName, { item: await get(`https://api.github.com/repos/${fullName}`), queries: new Set() });
          }
          hits.get(fullName).queries.add(q.id);
        }
        await sleep(7000); // code search allows about 10 requests a minute
      } else {
        const data = await get(`https://api.github.com/search/repositories?q=${encodeURIComponent(q.q)}&sort=stars&order=desc&per_page=${perPage}`);
        for (const item of data.items ?? []) {
          if (!hits.has(item.full_name)) hits.set(item.full_name, { item, queries: new Set() });
          hits.get(item.full_name).queries.add(q.id);
        }
        await sleep(2200); // search allows about 30 requests a minute
      }
    } catch (error) {
      errors.push(`${q.id}: ${error.message}`);
      if (error.rateLimited) break; // stop cleanly, keep what we have, say so in the report
    }
  }
  return { hits, errors };
}

const key = (url) => url.toLowerCase().replace(/\/+$/, "");

export function buildResult({ hits, errors, catalog, state, sources, now, limit = 25 }) {
  const known = new Set(catalog.map((r) => key(r.url)));
  const skipped = { archived: 0, fork: 0, lowStars: 0, stale: 0, alreadyCatalogued: 0 };
  const fresh = [];

  for (const { item, queries } of hits.values()) {
    const repo = normalise(item);
    if (known.has(key(repo.url))) { skipped.alreadyCatalogued++; continue; }
    if (repo.archived) { skipped.archived++; continue; }
    if (repo.fork) { skipped.fork++; continue; }
    if (repo.stars < sources.minStars) { skipped.lowStars++; continue; }
    if (!repo.pushedAt || (now - Date.parse(repo.pushedAt)) / DAY > sources.maxAgeDays) { skipped.stale++; continue; }
    const licence = classifyLicence(repo.licence);
    fresh.push({
      ...repo,
      licenceClass: licence.class,
      guidance: licence.guidance,
      suggestedCategory: categoryOf(repo, sources.categoryRules),
      suggestedExecutionRisk: executionRiskOf(repo, sources.executionKeywords),
      foundBy: [...queries].sort(),
      isDirectory: /(^|[-_/])awesome([-_]|$)/i.test(repo.fullName),
      score: score(repo, now, queries.size),
    });
  }
  fresh.sort((a, b) => b.score - a.score || b.stars - a.stars);
  const top = fresh.slice(0, limit);

  // Persistent state: anything we have seen keeps its review status; new things start as "new".
  const items = { ...(state.items ?? {}) };
  const newlySeen = [];
  for (const c of top) {
    const k = key(c.url);
    if (!items[k]) {
      items[k] = { url: c.url, name: c.fullName, status: "new", firstSeen: new Date(now).toISOString().slice(0, 10) };
      newlySeen.push(c);
    }
    items[k].lastSeen = new Date(now).toISOString().slice(0, 10);
    items[k].stars = c.stars;
    items[k].licence = c.licence;
  }
  const alreadyReviewed = top.filter((c) => items[key(c.url)].status !== "new" && !newlySeen.includes(c));

  // Pulse on the catalogue: things that changed under our feet.
  const byUrl = new Map([...hits.values()].map(({ item }) => [key(item.html_url), normalise(item)]));
  const pulse = [];
  for (const entry of catalog) {
    const live = byUrl.get(key(entry.url));
    if (!live) continue;
    const notes = [];
    if (live.archived) notes.push("archived upstream");
    if (entry.license && live.licence && entry.license !== live.licence) notes.push(`licence changed ${entry.license} -> ${live.licence}`);
    if (entry.stars && Math.abs(live.stars - entry.stars) / entry.stars > 0.25) notes.push(`stars ${entry.stars} -> ${live.stars}`);
    if (notes.length) pulse.push({ name: entry.name, url: entry.url, notes });
  }

  return { candidates: top, newlySeen, alreadyReviewed, skipped, pulse, errors, state: { version: 1, items } };
}

export function renderReport({ result, week, date, queryCount }) {
  const traps = result.candidates.filter((c) => ["network-copyleft", "strong-copyleft", "none", "verify"].includes(c.licenceClass));
  const lines = [
    `# Weekly harvest ${week}`,
    "",
    `Generated ${date} from ${queryCount} searches. Proposals only: nothing here is in the catalogue until it is reviewed. Educational research, not investment advice.`,
    "",
    `**${result.newlySeen.length} new** candidates, ${result.alreadyReviewed.length} seen before, ${result.skipped.alreadyCatalogued} already catalogued.`,
    "",
  ];
  if (result.errors.length) lines.push("## Incomplete run", "", ...result.errors.map((e) => `- ${e}`), "", "Results below are partial.", "");
  const projects = result.newlySeen.filter((c) => !c.isDirectory);
  const directories = result.newlySeen.filter((c) => c.isDirectory);
  lines.push("## New candidates", "", "| Repo | Stars | Licence | Guidance | Suggested category | Execution risk | Found by |", "|---|---|---|---|---|---|---|");
  for (const c of projects) {
    lines.push(`| [${c.fullName}](${c.url}) | ${c.stars} | ${c.licence ?? "none"} (${c.licenceClass}) | ${c.guidance} | ${c.suggestedCategory} | ${c.suggestedExecutionRisk} | ${c.foundBy.join(", ")} |`);
  }
  if (!projects.length) lines.push("| none this week | | | | | | |");
  lines.push("", "## Directories to mine", "", "Curated lists are sources for future searches, not projects to absorb.", "");
  lines.push(directories.length ? directories.map((c) => `- [${c.fullName}](${c.url}): ${c.stars} stars, ${c.licence ?? "no licence"}`).join("\n") : "- none this week");
  lines.push("", "## Licence traps", "");
  lines.push(traps.length ? traps.map((c) => `- **${c.fullName}**: ${c.licence ?? "no licence"}. ${c.guidance}`).join("\n") : "- none among this week's candidates");
  lines.push("", "## Catalogue pulse", "");
  lines.push(result.pulse.length ? result.pulse.map((p) => `- [${p.name}](${p.url}): ${p.notes.join("; ")}`).join("\n") : "- no changes above the alert thresholds among catalogued repos that were re-found");
  lines.push("", "## Skipped", "", `archived ${result.skipped.archived}, forks ${result.skipped.fork}, under the star floor ${result.skipped.lowStars}, stale ${result.skipped.stale}.`, "");
  lines.push("## Review checklist", "", "- [ ] Read the LICENSE file for every candidate you want to keep (SPDX detection is a hint, not a ruling)", "- [ ] Mark the execution risk by reading the README, not the keywords", "- [ ] Add accepted entries to `data/repos.json` with `whyIncluded`, `notFor` and `reviewedAt`", "- [ ] Set the status in `data/candidates.json` to `accepted`, `rejected` or `watch`", "");
  return lines.join("\n");
}

export async function run({ root = ROOT, token, date = new Date(), limit = 25, dryRun = false, fetchImpl, sleep } = {}) {
  const sources = JSON.parse(readFileSync(join(root, "data/sources.json"), "utf8"));
  const catalog = JSON.parse(readFileSync(join(root, "data/repos.json"), "utf8")).repos;
  const statePath = join(root, "data/candidates.json");
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : { version: 1, items: {} };
  const now = date.getTime();

  const { hits, errors } = await search({ queries: sources.queries, token, fetchImpl, sleep });
  const result = buildResult({ hits, errors, catalog, state, sources, now, limit });
  const week = isoWeek(date);
  const report = renderReport({ result, week, date: date.toISOString().slice(0, 10), queryCount: sources.queries.length });

  if (!dryRun) {
    mkdirSync(join(root, "reports"), { recursive: true });
    writeFileSync(join(root, "reports", `${week}.md`), report, "utf8");
    writeFileSync(statePath, `${JSON.stringify(result.state, null, 2)}\n`, "utf8");
  }
  return { result, report, week };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const args = process.argv.slice(2);
  const flag = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) console.error("warning: no GITHUB_TOKEN; unauthenticated search is heavily rate limited and code search is unavailable");
  const { result, week } = await run({
    token,
    limit: Number(flag("limit", 25)),
    dryRun: args.includes("--dry-run"),
    date: flag("date") ? new Date(`${flag("date")}T00:00:00Z`) : new Date(),
  });
  console.log(`${week}: ${result.newlySeen.length} new, ${result.alreadyReviewed.length} seen before, ${result.skipped.alreadyCatalogued} catalogued${result.errors.length ? `, ${result.errors.length} error(s)` : ""}`);
  for (const e of result.errors) console.error(`  ! ${e}`);
}
