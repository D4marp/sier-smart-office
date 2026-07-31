# Hapus Task Scheduler FISIPOL Smart Energy Dashboard. Jalankan sebagai Administrator.
Unregister-ScheduledTask -TaskName 'FISIPOL-SmartEnergy-Dashboard' -Confirm:$false
Write-Output "Task 'FISIPOL-SmartEnergy-Dashboard' dihapus."
