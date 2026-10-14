param(
  [Parameter(Position = 0)]
  [string]$Term
)

if ([string]::IsNullOrWhiteSpace($Term)) {
  Write-Host "Uso: .\tools\search_symbol.ps1 <termo>"
  Write-Host "Busca recursiva com contexto, ignorando dependencias/build e linhas apenas comentadas."
  exit 1
}

$ErrorActionPreference = "Stop"

if (-not (Get-Command rg -ErrorAction SilentlyContinue)) {
  $knownRg = @(
    "C:\Program Files\Azure Data Studio\resources\app\node_modules.asar.unpacked\@vscode\ripgrep\bin\rg.exe",
    "$env:LOCALAPPDATA\Programs\Microsoft VS Code\resources\app\node_modules.asar.unpacked\@vscode\ripgrep\bin\rg.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($knownRg) {
    Set-Alias -Name rg -Value $knownRg -Scope Script
  }
}

$root = (Resolve-Path ".").Path
$preferredRoots = @("src", "app", "components", "lib", "hooks", "scripts", "supabase", "migrations", "docs")
$searchRoots = @()

foreach ($candidate in $preferredRoots) {
  if (Test-Path -LiteralPath (Join-Path $root $candidate)) {
    $searchRoots += $candidate
  }
}

if ($searchRoots.Count -eq 0) {
  $searchRoots = @(".")
}

$globs = @(
  "--glob", "*.ts",
  "--glob", "*.tsx",
  "--glob", "*.js",
  "--glob", "*.mjs",
  "--glob", "*.css",
  "--glob", "*.json",
  "--glob", "*.sql",
  "--glob", "*.md",
  "--glob", "!**/.git/**",
  "--glob", "!**/.next/**",
  "--glob", "!**/node_modules/**",
  "--glob", "!**/dist/**",
  "--glob", "!**/build/**",
  "--glob", "!**/coverage/**",
  "--glob", "!**/*.tsbuildinfo"
)

$commentOnlyPattern = "^\s*(//|/\*|\*|#|--|<!--)"
rg --line-number --context 2 --color never @globs -- $Term @searchRoots |
  Where-Object { $_ -notmatch "^\S+[-:]\d+[-:]\s*$commentOnlyPattern" }
