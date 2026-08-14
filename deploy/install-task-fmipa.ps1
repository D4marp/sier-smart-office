# =============================================================
#  Daftarkan Task Scheduler: FMIPA Smart Energy Dashboard
#  Berjalan otomatis saat komputer BOOT (akun SYSTEM), menjalankan
#  XAMPP (MySQL + Apache) + Backend + Frontend.
#  Jalankan skrip ini SEBAGAI ADMINISTRATOR di Mini PC FMIPA.
#
#  CATATAN: cek dulu $ScriptPath cocok dengan lokasi start-fmipa.ps1
#  yang sebenarnya di Mini PC ini sebelum register task.
# =============================================================
$TaskName   = 'FMIPA-SmartEnergy-Dashboard'
$ScriptPath = 'C:\Users\fmipa\Downloads\unesa-psikologi-main\unesa-psikologi-main\deploy\start-fmipa.ps1'

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
    -Description 'Auto-start XAMPP (MySQL+Apache) + Smart Energy Dashboard (Backend :5001 + Frontend :3001) untuk FMIPA UNESA saat boot.' `
    -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force |
    Out-Null

"OK: Task '$TaskName' terdaftar." | Out-File 'C:\Users\fmipa\Downloads\unesa-psikologi-main\unesa-psikologi-main\deploy\install-result.log' -Encoding utf8
