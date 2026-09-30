#!/usr/bin/env node
// Portable catalogue validator (Node). The PowerShell validator only runs on Windows; this one runs in CI.
// Checks data/repos.json, data/candidates.json and the public-safety phrases in every markdown file.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED = ["name", "url", "category", "assetClass", "integrationUse", "executionRisk", "privacyRisk", "whyIncluded", "notFor", "reviewedAt"];
const EXECUTION = ["execution-adjacent", "regulated-adjacent", "research-only", "simulation"];
const PRIVACY = ["low", "medium", "high"];
const STATUS = ["new", "accepted", "rejected", "watch"];
const FORBIDDEN = ["seed phrase:", "private key:", "guaranteed return", "guaranteed returns", "move money now", "buy this now", "sell this now", "you should buy", "you should sell"];
const SKIP = new Set([".git", ".worktrees", "node_modules", ".asph-wip"]);

function* markdown(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* markdown(full);
    else if (name.endsWith(".md")) yield full;
  }
}

export function validate({ root = ROOT } = {}) {
  const errors = [];
  const catalogPath = join(root, "data/repos.json");
  if (!existsSync(catalogPath)) return [`missing ${catalogPath}`];
  const repos = JSON.parse(readFileSync(catalogPath, "utf8")).repos ?? [];
  const seen = new Set();

  for (const repo of repos) {
    for (const field of REQUIRED) {
      if (!(field in repo)) errors.push(`${repo.name ?? "?"}: missing field ${field}`);
      else if (String(repo[field]).trim() === "") errors.push(`${repo.name}: blank field ${field}`);
    }
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(repo.url ?? "")) errors.push(`${repo.name}: url must be a GitHub repository URL`);
    if (repo.executionRisk && !EXECUTION.includes(repo.executionRisk)) errors.push(`${repo.name}: executionRisk "${repo.executionRisk}" not in ${EXECUTION.join("|")}`);
    if (repo.privacyRisk && !PRIVACY.includes(repo.privacyRisk)) errors.push(`${repo.name}: privacyRisk "${repo.privacyRisk}" not in ${PRIVACY.join("|")}`);
    if (repo.reviewedAt && !/^\d{4}-\d{2}-\d{2}$/.test(repo.reviewedAt)) errors.push(`${repo.name}: reviewedAt must be YYYY-MM-DD`);
    if (repo.stars !== undefined && !Number.isInteger(repo.stars)) errors.push(`${repo.name}: stars must be an integer`);
    const k = (repo.url ?? "").toLowerCase().replace(/\/+$/, "");
    if (seen.has(k)) errors.push(`${repo.name}: duplicate url`);
    seen.add(k);
  }

  const statePath = join(root, "data/candidates.json");
  if (existsSync(statePath)) {
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    if (state.version !== 1) errors.push("candidates.json: version must be 1");
    for (const [url, item] of Object.entries(state.items ?? {})) {
      if (url !== url.toLowerCase()) errors.push(`candidates.json: key ${url} must be lowercase`);
      if (!STATUS.includes(item.status)) errors.push(`candidates.json: ${url} status "${item.status}" not in ${STATUS.join("|")}`);
      if (item.status === "accepted" && !seen.has(url.replace(/\/+$/, ""))) errors.push(`candidates.json: ${url} is accepted but not in data/repos.json`);
    }
  }

  for (const file of markdown(root)) {
    const text = readFileSync(file, "utf8").toLowerCase();
    for (const term of FORBIDDEN) if (text.includes(term)) errors.push(`${file.slice(root.length + 1)}: forbidden phrase "${term}"`);
  }
  return errors;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const errors = validate();
  if (errors.length) {
    for (const e of errors) console.error(`  ${e}`);
    console.error(`\nCatalogue validation FAILED (${errors.length}).`);
    process.exit(1);
  }
  console.log("Catalogue validation passed.");
}
