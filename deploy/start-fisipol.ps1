# =============================================================
#  Smart Energy Dashboard - FISIPOL UNESA
#  Startup script: XAMPP (MySQL + Apache) + Backend + Frontend
#  Dipanggil oleh Windows Task Scheduler saat boot.
# =============================================================
$ErrorActionPreference = 'SilentlyContinue'

$Proj = 'C:\Users\fisip\Downloads\unesa-psikologi-main\unesa-psikologi-main'
$Node = 'C:\Program Files\nodejs\node.exe'
$NextBin = Join-Path $Proj 'node_modules\next\dist\bin\next'
$LogDir = Join-Path $Proj 'logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Log($msg) {
    "$([DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss'))  $msg" |
        Out-File -FilePath (Join-Path $LogDir 'startup.log') -Append -Encoding utf8
}

Log '===== Startup dipicu ====='

# --- 1. XAMPP MySQL (port 3306) ---
if (-not (Get-Process mysqld -ErrorAction SilentlyContinue)) {
    Start-Process -FilePath 'C:\xampp\mysql\bin\mysqld.exe' `
        -ArgumentList '--defaults-file=C:\xampp\mysql\bin\my.ini' `
        -WorkingDirectory 'C:\xampp\mysql\bin' -WindowStyle Hidden
    Log 'MySQL (mysqld) dijalankan'
} else {
    Log 'MySQL sudah berjalan'
}

# --- 2. XAMPP Apache (port 80, phpMyAdmin) ---
if (-not (Get-Process httpd -ErrorAction SilentlyContinue)) {
    Start-Process -FilePath 'C:\xampp\apache\bin\httpd.exe' `
        -WorkingDirectory 'C:\xampp\apache\bin' -WindowStyle Hidden
    Log 'Apache (httpd) dijalankan'
} else {
    Log 'Apache sudah berjalan'
}

# --- 3. Tunggu MySQL siap menerima koneksi (maks ~60 dtk) ---
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    & 'C:\xampp\mysql\bin\mysqladmin.exe' -u root --host=127.0.0.1 --port=3306 ping 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
}
Log "MySQL siap: $ready"

# --- 4. Backend API (port 5001) ---
if (-not (Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*server.js*' })) {
    Start-Process -FilePath $Node -ArgumentList 'server.js' `
        -WorkingDirectory (Join-Path $Proj 'backend') -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $LogDir 'backend.out.log') `
        -RedirectStandardError  (Join-Path $LogDir 'backend.err.log')
    Log 'Backend (server.js :5001) dijalankan'
} else {
    Log 'Backend sudah berjalan'
}

# --- 5. Frontend Next.js (port 3001) ---
if (-not (Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*next*start*' })) {
    Start-Process -FilePath $Node -ArgumentList "`"$NextBin`"", 'start', '-p', '3001' `
        -WorkingDirectory $Proj -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $LogDir 'frontend.out.log') `
        -RedirectStandardError  (Join-Path $LogDir 'frontend.err.log')
    Log 'Frontend (next start :3001) dijalankan'
} else {
    Log 'Frontend sudah berjalan'
}

Log 'Startup selesai. Dashboard: http://localhost:3001'
