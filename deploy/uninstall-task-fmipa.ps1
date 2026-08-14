# Hapus Task Scheduler FMIPA Smart Energy Dashboard. Jalankan sebagai Administrator.
Unregister-ScheduledTask -TaskName 'FMIPA-SmartEnergy-Dashboard' -Confirm:$false
Write-Output "Task 'FMIPA-SmartEnergy-Dashboard' dihapus."
