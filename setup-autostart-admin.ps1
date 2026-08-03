# =============================================================
# Setup auto-start Smart Energy Dashboard (jalankan SEKALI saja).
# WAJIB dijalankan sebagai Administrator:
#   klik kanan file ini -> "Run with PowerShell" (as Administrator)
#   atau: buka PowerShell as Administrator lalu jalankan path file ini.
#
# Yang dilakukan:
#   1. Install MySQL (XAMPP) sebagai Windows Service -> auto-start
#      saat boot, bahkan sebelum ada yang login.
#   2. Daftarkan Scheduled Task yang menjalankan PM2 resurrect
#      (backend + frontend) setiap kali user ini login ke Windows.
# =============================================================

$ErrorActionPreference = 'Stop'

function Assert-Admin {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Host "ERROR: Script ini harus dijalankan sebagai Administrator." -ForegroundColor Red
        Write-Host "Klik kanan file ini -> Run with PowerShell (as Administrator)." -ForegroundColor Yellow
        exit 1
    }
}

Assert-Admin

$mysqldPath = "C:\xampp\mysql\bin\mysqld.exe"
$myIniPath  = "C:\xampp\mysql\bin\my.ini"
$serviceName = "MySQLXAMPP"

Write-Host "1) Menghentikan MySQL yang berjalan manual (jika ada)..." -ForegroundColor Cyan
$mysqldProc = Get-Process -Name "mysqld" -ErrorAction SilentlyContinue
if ($mysqldProc) {
    & "C:\xampp\mysql\bin\mysqladmin.exe" -u root shutdown 2>$null
    Start-Sleep -Seconds 3
}

Write-Host "2) Install MySQL sebagai Windows Service ('$serviceName')..." -ForegroundColor Cyan
$existing = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if (-not $existing) {
    & $mysqldPath --install $serviceName --defaults-file="$myIniPath"
} else {
    Write-Host "   Service '$serviceName' sudah terdaftar, dilewati." -ForegroundColor Yellow
}

Write-Host "3) Set start type Automatic & start service..." -ForegroundColor Cyan
Set-Service -Name $serviceName -StartupType Automatic
Start-Service -Name $serviceName
Get-Service -Name $serviceName | Format-Table Name, Status, StartType -AutoSize

Write-Host "4) Daftarkan Scheduled Task PM2 (backend+frontend) saat login..." -ForegroundColor Cyan
$vbsPath = "C:\Users\FIP Unesa\unesa-psikologi\start-all.vbs"
$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$vbsPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "SmartEnergyDashboard-AutoStart" -Action $action -Trigger $trigger `
    -Description "Auto-start PM2 (Smart Energy Dashboard backend/frontend) saat login Windows" -Force | Out-Null
Write-Host "   Task 'SmartEnergyDashboard-AutoStart' terdaftar." -ForegroundColor Green

Write-Host ""
Write-Host "SELESAI. Setelah restart Windows:" -ForegroundColor Green
Write-Host "  - MySQL (XAMPP) otomatis jalan sebagai service, bahkan sebelum login." -ForegroundColor Green
Write-Host "  - Saat Anda login, backend + frontend (PM2) otomatis jalan kembali." -ForegroundColor Green
Write-Host ""
Write-Host "Catatan: XAMPP Control Panel mungkin masih menampilkan MySQL 'Stopped'" -ForegroundColor Yellow
Write-Host "karena service ini berjalan di luar Control Panel - itu normal, cek dengan:" -ForegroundColor Yellow
Write-Host "  Get-Service $serviceName" -ForegroundColor Yellow
