@echo off
title Monopoly Deal Launcher
color 0a

echo ==============================
echo    MONOPOLY DEAL BASLATILIYOR
echo ==============================
echo.

:: SERVER BASLAT
echo [SERVER] Baslatiliyor...
start "SERVER LOG" cmd /k "cd /d "%~dp0server" && npm install && npm start"

:: CLIENT BASLAT
echo [CLIENT] Baslatiliyor...
start "CLIENT LOG" cmd /k "cd /d "%~dp0client" && echo [CLIENT] Bagimliliklar kontrol ediliyor... && npm install && echo [CLIENT] Mobil stabilite icin build aliniyor... (Bu biraz zaman alabilir) && npm run build && echo [CLIENT] Production sunucusu baslatiliyor... && npx serve -s dist -p 3000"

echo.
echo Tum servisler baslatildi!
echo.
echo NOT: Client artik 3000 portunda 'Production' modunda calisiyor.
pause