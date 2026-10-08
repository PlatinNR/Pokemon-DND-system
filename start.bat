@echo off
chcp 65001 >nul
title Pokemon Pen and Paper - Live Server (DM & Trainer)
cd /d "%~dp0"

echo ================================================================
echo   POKÉMON PEN & PAPER - SCHWARZ & WEISS (GEN 1 BIS 5)
echo   Live-Server für Spielleiter (DM) & Trainer (Spieler-App)
echo ================================================================
echo.
echo Starte Browser und Live-Server auf Port 3000...
echo.

timeout /t 1 >nul
start "" http://localhost:3000/download.html

node server.js
if %errorlevel% neq 0 (
    echo.
    echo Node.js nicht verfügbar, starte Python-Fallback...
    python server.py
)

pause
