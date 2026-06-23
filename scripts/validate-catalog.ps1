$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$catalogPath = Join-Path $root "data/repos.json"
$catalog = Get-Content -Raw $catalogPath | ConvertFrom-Json

$required = @(
  "name",
  "url",
  "category",
  "assetClass",
  "integrationUse",
  "executionRisk",
  "privacyRisk",
  "whyIncluded",
  "notFor",
  "reviewedAt"
)

foreach ($repo in $catalog.repos) {
  foreach ($field in $required) {
    if (-not $repo.PSObject.Properties.Name.Contains($field)) {
      throw "Missing field '$field' in catalog entry: $($repo.name)"
    }
    if ([string]::IsNullOrWhiteSpace([string]$repo.$field)) {
      throw "Blank field '$field' in catalog entry: $($repo.name)"
    }
  }
  if ($repo.url -notmatch '^https://github\.com/') {
    throw "Non-GitHub URL in catalog entry: $($repo.name)"
  }
}

$forbidden = @(
  "seed phrase:",
  "private key:",
  "guaranteed return",
  "guaranteed returns",
  "move money now",
  "buy this now",
  "sell this now"
)

$markdownFiles = Get-ChildItem -Path $root -Recurse -Include *.md | Where-Object {
  $_.FullName -notmatch "\\.git\\"
}

foreach ($file in $markdownFiles) {
  $text = (Get-Content -Raw $file.FullName).ToLowerInvariant()
  foreach ($term in $forbidden) {
    if ($text.Contains($term)) {
      throw "Forbidden public-safety phrase '$term' found in $($file.FullName)"
    }
  }
}

Write-Host "Catalog validation passed for $($catalog.repos.Count) repos."
