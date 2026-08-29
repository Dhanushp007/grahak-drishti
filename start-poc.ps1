$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$ComposeFile = Join-Path $Root "infrastructure\docker-compose.yml"
$DatabaseUrl = "postgresql+psycopg://grahak:grahak_dev@127.0.0.1:5432/grahak_drishti"
$ContactHashSecret = "local-development-contact-hash-secret"

function Select-FreePort([int[]]$Candidates) {
    foreach ($candidate in $Candidates) {
        if (-not (Get-NetTCPConnection -State Listen -LocalPort $candidate -ErrorAction SilentlyContinue)) {
            return $candidate
        }
    }
    throw "No free port found in: $($Candidates -join ', ')"
}

function Invoke-CheckedCommand([string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory) {
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE`: $FilePath $($Arguments -join ' ')"
    }
}

function Stop-ServiceProcesses {
    foreach ($process in @($script:ServiceProcesses)) {
        if ($null -ne $process -and -not $process.HasExited) {
            & taskkill.exe /PID $process.Id /T /F > $null 2>&1
        }
    }
    $script:ServiceProcesses = @()
}

if (-not (Get-Command python.exe -ErrorAction SilentlyContinue)) {
    throw "Python 3.11 or newer is required and must be available as python."
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "Node.js and npm are required and must be available as npm."
}

$CitizenPort = Select-FreePort @(3000, 3010, 3020)
$AdminPort = Select-FreePort @(3001, 3011, 3021)
$ApiPort = Select-FreePort @(8000, 8010, 8020)
$ApiOrigin = "http://127.0.0.1:$ApiPort"

if ($CitizenPort -ne 3000) { Write-Host "Port 3000 is busy. Citizen web will use $CitizenPort." }
if ($AdminPort -ne 3001) { Write-Host "Port 3001 is busy. Government dashboard will use $AdminPort." }
if ($ApiPort -ne 8000) { Write-Host "Port 8000 is busy. API will use $ApiPort." }

Push-Location $Root
try {
    $docker = Get-Command docker.exe -ErrorAction SilentlyContinue
    $postgresReady = $false
    if ($null -ne $docker) {
        Write-Host "Starting PostgreSQL..."
        & docker.exe compose -f $ComposeFile up -d postgres
        if ($LASTEXITCODE -eq 0) {
            foreach ($attempt in 1..30) {
                & docker.exe compose -f $ComposeFile exec -T postgres pg_isready -U grahak -d grahak_drishti > $null 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $postgresReady = $true
                    break
                }
                timeout.exe /t 1 /nobreak > $null
            }
        }
    }
    if (-not $postgresReady) {
        $DatabaseUrl = "sqlite:///./demo-poc.db"
        Write-Host "Docker/PostgreSQL is unavailable. Using local SQLite at demo-poc.db for the POC."
    }
    $env:DATABASE_URL = $DatabaseUrl
    $env:CONTACT_HASH_SECRET = $ContactHashSecret

    Write-Host "Applying database migrations..."
    Invoke-CheckedCommand "python.exe" @("-m", "alembic", "upgrade", "head") $Root
    Write-Host "Restoring deterministic synthetic demo data..."
    Invoke-CheckedCommand "python.exe" @("-m", "scripts.seed_demo", "--reset") $Root

    $citizenNodeModules = Join-Path $Root "apps\citizen-web\node_modules"
    if (-not (Test-Path $citizenNodeModules)) {
        Write-Host "Installing citizen web dependencies..."
        Invoke-CheckedCommand "npm.cmd" @("ci", "--prefix", (Join-Path $Root "apps\citizen-web")) $Root
    }
    $adminNodeModules = Join-Path $Root "apps\admin-dashboard\node_modules"
    if (-not (Test-Path $adminNodeModules)) {
        Write-Host "Installing government dashboard dependencies..."
        Invoke-CheckedCommand "npm.cmd" @("ci", "--prefix", (Join-Path $Root "apps\admin-dashboard")) $Root
    }

    $script:ServiceProcesses = @(
        (Start-Process cmd.exe -WorkingDirectory $Root -ArgumentList "/k", "title GRAHAK API && set DATABASE_URL=$DatabaseUrl && set CONTACT_HASH_SECRET=$ContactHashSecret && python -m uvicorn services.api.app.main:app --host 127.0.0.1 --port $ApiPort" -PassThru),
        (Start-Process cmd.exe -WorkingDirectory $Root -ArgumentList "/k", "title GRAHAK Complaint Worker && set DATABASE_URL=$DatabaseUrl && set CONTACT_HASH_SECRET=$ContactHashSecret && python -m services.complaint_worker.app.worker --interval 0.1" -PassThru),
        (Start-Process cmd.exe -WorkingDirectory (Join-Path $Root "apps\citizen-web") -ArgumentList "/k", "title GRAHAK Citizen Web && set API_ORIGIN=$ApiOrigin && npm run dev -- --port $CitizenPort" -PassThru),
        (Start-Process cmd.exe -WorkingDirectory (Join-Path $Root "apps\admin-dashboard") -ArgumentList "/k", "title GRAHAK Government Dashboard && set API_ORIGIN=$ApiOrigin && npm run dev -- --port $AdminPort" -PassThru)
    )
    $watchPath = Join-Path $Root "stop-poc-watch.ps1"
    $servicePids = ($script:ServiceProcesses | ForEach-Object { $_.Id }) -join ","
    $watchArguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -File `"$watchPath`" -ControllerPid $PID -ServicePids $servicePids"
    $watchdog = Start-Process powershell.exe -WindowStyle Hidden -ArgumentList $watchArguments -PassThru

    Write-Host ""
    Write-Host "GRAHAK-DRISHTI is running in four service windows."
    Write-Host "Citizen web:       http://127.0.0.1:$CitizenPort"
    Write-Host "Government view:   http://127.0.0.1:$AdminPort"
    Write-Host "API health:        http://127.0.0.1:$ApiPort/health"
    Write-Host ""
    Write-Host "Press Ctrl+C in this launcher window to close all four service windows."

    $cancelHandler = [ConsoleCancelEventHandler]{
        param($sender, $event)
        $event.Cancel = $true
        $script:StopRequested = $true
    }
    [Console]::add_CancelKeyPress($cancelHandler)
    try {
        while (-not $script:StopRequested) {
            $script:ServiceProcesses = @($script:ServiceProcesses | Where-Object { -not $_.HasExited })
            if ($script:ServiceProcesses.Count -eq 0) {
                break
            }
            timeout.exe /t 1 /nobreak > $null
        }
    }
    finally {
        [Console]::remove_CancelKeyPress($cancelHandler)
        Stop-ServiceProcesses
        if ($null -ne $watchdog -and -not $watchdog.HasExited) {
            Stop-Process -Id $watchdog.Id -Force -ErrorAction SilentlyContinue
        }
        Write-Host "All GRAHAK-DRISHTI service windows have been closed."
    }
}
catch {
    Stop-ServiceProcesses
    Write-Error $_
    exit 1
}
finally {
    Pop-Location
}
