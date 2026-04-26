# Phase 7 -- execute the load-test suite in the recommended order.
# Windows / PowerShell counterpart to run-all.sh.
#
# Required env:
#   $env:BASE_URL         e.g. https://offerflow-server-staging.onrender.com
#   $env:WS_URL           e.g. wss://offerflow-server-staging.onrender.com/api/v1/interviews/ws
#   $env:USERS_FILE       path to the ndjson produced by lib/seed.js
#
# Optional env:
#   $env:METRICS_TOKEN    bearer token for /metrics
#   $env:PROM_OUT         e.g. http://localhost:9090/api/v1/write
#   $env:STAGE            quick | standard | full (default standard)
#
# Usage:
#   $env:BASE_URL = 'http://localhost:5000'
#   $env:WS_URL   = 'ws://localhost:5000/api/v1/interviews/ws'
#   $env:USERS_FILE = 'users.ndjson'
#   .\run-all.ps1

[CmdletBinding()]
param()

Set-Location $PSScriptRoot

if (-not $env:BASE_URL)   { throw 'BASE_URL required' }
if (-not $env:WS_URL)     { throw 'WS_URL required' }
if (-not $env:USERS_FILE) { throw 'USERS_FILE required (run lib/seed.js first)' }
$Stage         = if ($env:STAGE)         { $env:STAGE }         else { 'standard' }
$MetricsToken  = if ($env:METRICS_TOKEN) { $env:METRICS_TOKEN } else { '' }
$PromOut       = if ($env:PROM_OUT)      { $env:PROM_OUT }      else { '' }

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$out   = Join-Path 'results' $stamp
New-Item -ItemType Directory -Path $out -Force | Out-Null
Write-Host "[run-all] writing summaries to $out"

function Invoke-K6Run {
    param(
        [Parameter(Mandatory)] [string] $Name,
        [Parameter(Mandatory)] [string] $Script,
        [string[]] $Extra = @()
    )
    Write-Host ''
    Write-Host '----------------------------------------------------------------------'
    Write-Host (" >>> {0}  ({1})" -f $Name, $Script)
    Write-Host '----------------------------------------------------------------------'
    $k6Args = @(
        'run',
        '--summary-export', (Join-Path $out "$Name.json"),
        '-e', "BASE_URL=$env:BASE_URL",
        '-e', "WS_URL=$env:WS_URL",
        '-e', "USERS_FILE=$env:USERS_FILE",
        '-e', "METRICS_TOKEN=$MetricsToken"
    )
    if ($PromOut) { $k6Args += @('--out', "experimental-prometheus-rw=$PromOut") }
    $k6Args += $Extra
    $k6Args += @("k6/$Script")

    $log = Join-Path $out "$Name.log"
    & k6 @k6Args 2>&1 | Tee-Object -FilePath $log
    $rc = $LASTEXITCODE
    Set-Content -Path (Join-Path $out "$Name.rc") -Value $rc
    if ($rc -ne 0) { Write-Host "[run-all] $Name FAILED (rc=$rc)" -ForegroundColor Red }
    else           { Write-Host "[run-all] $Name OK" -ForegroundColor Green }
}

Invoke-K6Run -Name 'T0_metrics'      -Script 'metrics-scrape.js'
Invoke-K6Run -Name 'T1_rest_load'    -Script 'rest-load.js' -Extra @('-e','DURATION=5m','-e','READ_RPS=20','-e','WRITE_RPS=4')
Invoke-K6Run -Name 'T8_db_stress'    -Script 'db-stress.js'
if ($Stage -ne 'quick') {
    Invoke-K6Run -Name 'T3_auth_stress' -Script 'auth-stress.js'
}
$conns       = if ($env:CONNS)         { $env:CONNS }         else { '20' }
$sessionSecs = if ($env:SESSION_SECS)  { $env:SESSION_SECS }  else { '60' }
$hold        = if ($env:HOLD)          { $env:HOLD }          else { '2m' }
Invoke-K6Run -Name 'T4_ws_interview' -Script 'ws-interview.js' -Extra @('-e',"CONNS=$conns",'-e',"SESSION_SECS=$sessionSecs",'-e',"HOLD=$hold")
$perIp = if ($env:PER_IP_LIMIT) { $env:PER_IP_LIMIT } else { '10' }
$att   = if ($env:ATTEMPT)      { $env:ATTEMPT }      else { '15' }
Invoke-K6Run -Name 'T6b_ws_cap'      -Script 'ws-cap.js' -Extra @('-e',"PER_IP_LIMIT=$perIp",'-e',"ATTEMPT=$att")
if ($Stage -ne 'quick') {
    $peak = if ($env:PEAK) { $env:PEAK } else { '100' }
    Invoke-K6Run -Name 'T6_ws_spike' -Script 'ws-spike.js' -Extra @('-e',"PEAK=$peak")
}
Invoke-K6Run -Name 'T10_code_exec'   -Script 'code-exec.js'
Invoke-K6Run -Name 'T12_security'    -Script 'security.js'
if ($Stage -eq 'full') {
    $vus      = if ($env:VUS)      { $env:VUS }      else { '50' }
    $soakMin  = if ($env:SOAK_MIN) { $env:SOAK_MIN } else { '30' }
    Invoke-K6Run -Name 'T7_ws_soak' -Script 'ws-soak.js' -Extra @('-e',"VUS=$vus",'-e',"SOAK_MIN=$soakMin")
}

Write-Host ''
Write-Host '======================== run summary ========================'
$fail = 0
Get-ChildItem -Path $out -Filter '*.rc' | ForEach-Object {
    $name = $_.BaseName
    $rc   = (Get-Content $_.FullName).Trim()
    if ($rc -eq '0') {
        Write-Host ("  {0,-22} OK" -f $name) -ForegroundColor Green
    } else {
        Write-Host ("  {0,-22} FAIL (rc={1})" -f $name, $rc) -ForegroundColor Red
        $fail++
    }
}
Write-Host '============================================================='
if ($fail -ne 0) {
    Write-Host "[run-all] $fail tests failed -- see $out\*.log" -ForegroundColor Red
    exit 1
}
Write-Host '[run-all] all tests passed' -ForegroundColor Green
