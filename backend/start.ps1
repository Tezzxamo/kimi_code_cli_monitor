param(
    [string]$HostAddress = "127.0.0.1",
    [int]$Port = 8787
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Force UTF-8 in current console to avoid encoding issues.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom
chcp 65001 > $null

$venvDir = Join-Path $scriptDir ".venv"
$pythonInVenv = Join-Path $venvDir "Scripts\python.exe"
$requirementsFile = Join-Path $scriptDir "requirements.txt"
$requirementsHashFile = Join-Path $venvDir ".requirements.sha256"
$isFirstRun = $false

if (-not (Test-Path $pythonInVenv)) {
    Write-Host "[1/3] Creating virtual environment .venv ..."
    python -m venv ".venv"
    $isFirstRun = $true
}
else {
    Write-Host "[1/3] Reusing existing virtual environment .venv"
}

Write-Host "[2/3] Checking dependencies ..."

$reqHashNow = (Get-FileHash -Path $requirementsFile -Algorithm SHA256).Hash
$reqHashOld = ""
if (Test-Path $requirementsHashFile) {
    $reqHashOld = (Get-Content $requirementsHashFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
}

$needInstall = $isFirstRun -or ($reqHashNow -ne $reqHashOld)

if ($needInstall) {
    if ($isFirstRun) {
        Write-Host "      First startup detected, installing dependencies ..."
    }
    else {
        Write-Host "      requirements.txt changed, updating dependencies ..."
    }

    # Keep output concise: print details only when installation fails.
    $installLog = Join-Path $venvDir "pip-install.log"
    $pipArgs = @("-m", "pip", "install", "--disable-pip-version-check", "-r", $requirementsFile)
    & $pythonInVenv @pipArgs *> $installLog
    if ($LASTEXITCODE -ne 0) {
        Write-Host "      Dependency installation failed, details:"
        Get-Content $installLog
        exit $LASTEXITCODE
    }

    Set-Content -Path $requirementsHashFile -Value $reqHashNow -Encoding ASCII
    Remove-Item $installLog -ErrorAction SilentlyContinue
    Write-Host "      Dependencies ready."
}
else {
    Write-Host "      Dependencies are up to date, skipped."
}

Write-Host "[3/3] Starting backend server at http://$HostAddress`:$Port ..."
& $pythonInVenv -m uvicorn app.main:app --host $HostAddress --port $Port --reload

