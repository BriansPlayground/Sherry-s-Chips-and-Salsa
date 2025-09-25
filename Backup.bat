@echo off
set folderToBackup="."
set backupFolder=backups
set timestamp=%date:~10,4%-%date:~4,2%-%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set timestamp=%timestamp: =0%
set backupFile=%backupFolder%\sherrys-eats-site_backup_%timestamp%.zip

if not exist %backupFolder% mkdir %backupFolder%

powershell -Command "Compress-Archive -Path %folderToBackup% -DestinationPath '%backupFile%'"

echo Backup complete: %backupFile%
pause
