# 开发模式：同时启动前后端服务（热重载）
# 部署模式请直接构建前端后单独启动后端，参见 README.md / AGENTS.md

param(
    [string]$BackendHost = "127.0.0.1",
    [int]$BackendPort = 8787
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$backendScript = Join-Path $scriptDir "backend\start.ps1"
$frontendScript = Join-Path $scriptDir "frontend\run.ps1"
$backendUrl = "http://${BackendHost}:${BackendPort}"

Write-Host "========================================"
Write-Host "  Kimi Code CLI Monitor — 开发模式启动"
Write-Host "========================================"
Write-Host ""

Write-Host "[1/2] 启动后端 ($backendUrl) ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$($scriptDir)\backend`"; & `"$backendScript`" -HostAddress $BackendHost -Port $BackendPort"

Write-Host "[2/2] 启动前端 (Vite dev server) ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$($scriptDir)\frontend`"; & `"$frontendScript`""

Write-Host ""
Write-Host "两个服务已在新窗口启动："
Write-Host "  后端 : $backendUrl"
Write-Host "  前端 : http://127.0.0.1:5173 (默认)"
Write-Host ""
Write-Host "关闭对应窗口即可停止服务。"
Write-Host "========================================"
