@echo off
REM Auto-start script: XAMPP MySQL + PM2 (backend/frontend).
REM Dijalankan otomatis oleh Windows Task Scheduler saat login (lihat start-all.vbs).

tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I "mysqld.exe" >NUL
if errorlevel 1 (
  start "" "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini"
  timeout /t 5 /nobreak >NUL
)

pm2 resurrect
