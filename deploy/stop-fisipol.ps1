# =============================================================
#  Smart Energy Dashboard - FISIPOL UNESA
#  Stop script: hentikan Backend + Frontend + XAMPP (Apache + MySQL)
# =============================================================
$ErrorActionPreference = 'SilentlyContinue'

# Hentikan Node (backend server.js + frontend next start)
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -like '*server.js*' -or $_.CommandLine -like '*next*start*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

# Hentikan Apache lalu MySQL (urutan aman)
Get-Process httpd  -ErrorAction SilentlyContinue | Stop-Process -Force
& 'C:\xampp\mysql\bin\mysqladmin.exe' -u root --host=127.0.0.1 --port=3306 shutdown 2>$null
Start-Sleep -Seconds 3
Get-Process mysqld -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Output 'Semua layanan FISIPOL dihentikan.'
