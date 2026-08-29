param(
    [Parameter(Mandatory = $true)]
    [int]$ControllerPid,
    [Parameter(Mandatory = $true)]
    [string]$ServicePids
)

$ErrorActionPreference = "SilentlyContinue"
$trackedPids = @($ServicePids -split "," | ForEach-Object { [int]$_ })

while (Get-Process -Id $ControllerPid -ErrorAction SilentlyContinue) {
    timeout.exe /t 1 /nobreak > $null
}

foreach ($processId in $trackedPids) {
    & taskkill.exe /PID $processId /T /F > $null 2>&1
}
