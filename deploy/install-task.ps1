# =============================================================
#  Daftarkan Task Scheduler: FISIPOL Smart Energy Dashboard
#  Berjalan otomatis saat komputer BOOT (akun SYSTEM), menjalankan
#  XAMPP (MySQL + Apache) + Backend + Frontend.
#  Jalankan skrip ini SEBAGAI ADMINISTRATOR.
# =============================================================
$TaskName   = 'FISIPOL-SmartEnergy-Dashboard'
$ScriptPath = 'C:\Users\fisip\Downloads\unesa-psikologi-main\unesa-psikologi-main\deploy\start-fisipol.ps1'

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""

$trigger = New-ScheduledTaskTrigger -AtStartup
$trigger.Delay = 'PT30S'   # tunggu 30 dtk agar sistem & disk siap

$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' `
    -LogonType ServiceAccount -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TaskName `
    -Description 'Auto-start XAMPP (MySQL+Apache) + Smart Energy Dashboard (Backend :5001 + Frontend :3001) untuk FISIPOL UNESA saat boot.' `
    -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force |
    Out-Null

"OK: Task '$TaskName' terdaftar." | Out-File 'C:\Users\fisip\Downloads\unesa-psikologi-main\unesa-psikologi-main\deploy\install-result.log' -Encoding utf8
