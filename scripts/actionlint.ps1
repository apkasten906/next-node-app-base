Param(
  [string]$Version = "1.7.10",
  [string]$WorkflowsPath = ".github/workflows"
)

$ErrorActionPreference = "Stop"

$repo = "rhysd/actionlint"
$base = "https://github.com/$repo/releases/download/v$Version"
$zip = "actionlint_${Version}_windows_amd64.zip"
$checksums = "actionlint_${Version}_checksums.txt"

$tmpRoot = Join-Path $env:TEMP "actionlint-$Version"
$tmpZip = Join-Path $tmpRoot $zip
$tmpChecksums = Join-Path $tmpRoot $checksums
$tmpBinDir = Join-Path $tmpRoot "bin"
$exe = Join-Path $tmpBinDir "actionlint.exe"

New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
New-Item -ItemType Directory -Force -Path $tmpBinDir | Out-Null

Write-Host "Downloading actionlint v$Version..."
Invoke-WebRequest -UseBasicParsing -Uri "$base/$zip" -OutFile $tmpZip
Invoke-WebRequest -UseBasicParsing -Uri "$base/$checksums" -OutFile $tmpChecksums

$expected = (Select-String -Path $tmpChecksums -Pattern ([regex]::Escape($zip) + "$")) | Select-Object -First 1
if (-not $expected) {
  throw "Could not find SHA256 for $zip in $checksums"
}

# checksum line format: <sha256>  <filename>
$expectedSha = ($expected.Line -split "\s+")[0].Trim()
$actualSha = (Get-FileHash -Algorithm SHA256 -Path $tmpZip).Hash.ToLowerInvariant()

if ($actualSha -ne $expectedSha.ToLowerInvariant()) {
  throw "SHA256 mismatch for $zip. Expected $expectedSha but got $actualSha"
}

Write-Host "Extracting..."
Expand-Archive -Force -Path $tmpZip -DestinationPath $tmpBinDir

if (-not (Test-Path $exe)) {
  throw "actionlint.exe not found after extraction"
}

Write-Host "Running actionlint..."
& $exe -version

# Always run from repo root so relative paths resolve
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot

try {
  # actionlint on Windows can fail when passed a directory; pass files explicitly.
  $resolved = Resolve-Path -ErrorAction SilentlyContinue $WorkflowsPath

  $files = @()
  if ($resolved) {
    foreach ($p in $resolved) {
      if (Test-Path $p -PathType Container) {
        $files += Get-ChildItem -Path $p -Recurse -File -Include *.yml, *.yaml | ForEach-Object FullName
      } elseif (Test-Path $p -PathType Leaf) {
        $files += (Resolve-Path $p).Path
      }
    }
  } else {
    # If it's a glob pattern, expand it.
    $files += Get-ChildItem -Path $WorkflowsPath -ErrorAction SilentlyContinue | ForEach-Object FullName
  }

  $files = $files | Where-Object { $_ -and (Test-Path $_ -PathType Leaf) } | Sort-Object -Unique
  if ($files.Count -eq 0) {
    throw "No workflow files found for '$WorkflowsPath'"
  }

  & $exe @files
}
finally {
  Pop-Location
}
