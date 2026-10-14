param(
  [string]$EnvFile = (Join-Path $PSScriptRoot '..\.env'),
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\..\backups')
)

$ErrorActionPreference = 'Stop'
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
  throw 'pg_dump was not found. Install PostgreSQL command-line tools, then rerun this script.'
}

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Environment file not found: $EnvFile"
}

$databaseLine = Get-Content -LiteralPath $EnvFile | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
if (-not $databaseLine) {
  throw 'DATABASE_URL is missing from the selected environment file.'
}

$databaseUrl = ($databaseLine -split '=', 2)[1].Trim().Trim('"').Trim("'")
if (-not $databaseUrl.StartsWith('postgres://') -and -not $databaseUrl.StartsWith('postgresql://')) {
  throw 'DATABASE_URL must be a PostgreSQL connection URL.'
}
# `schema` is a Prisma connection parameter, not a libpq URI parameter understood by pg_dump.
$databaseUrl = $databaseUrl -replace '([?&])schema=[^&]*&?', '$1'
$databaseUrl = $databaseUrl -replace '[?&]$', ''

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupPath = Join-Path $OutputDirectory "2annews-$timestamp.dump"
& $pgDump.Source --format=custom --no-owner --no-acl --file $backupPath --dbname $databaseUrl
if ($LASTEXITCODE -ne 0) {
  Remove-Item -LiteralPath $backupPath -Force -ErrorAction SilentlyContinue
  throw "pg_dump failed with exit code $LASTEXITCODE. The local database was not modified."
}

Write-Output "Database backup created: $backupPath"
