@echo off
chcp 65001 >nul
title Pokémon Pen & Paper - APK Builder

echo ===============================================================================
echo     POKÉMON PEN & PAPER - ANDROID APK BUILDER & VERTEILUNGS-HELFER
echo ===============================================================================
echo.
echo Dieses Skript hilft dir dabei, die Trainer-App als Android APK zu bauen
echo oder die PWA-Installation vorzubereiten.
echo.
echo WÄHLE EINE OPTION:
echo [1] PWA Direkt-Installation erklären (Kein Kompilieren nötig - Einfachste Methode!)
echo [2] Capacitor Android-Projekt initialisieren (Native .apk mit Android Studio)
echo [3] Bubblewrap / PWABuilder CLI starten (Erstellt direkte .apk via Google Bubblewrap)
echo [4] Server starten & Download-Portal öffnen
echo [5] Beenden
echo.
set /p OPTION="Option eingeben (1-5): "

if "%OPTION%"=="1" goto PWA_INFO
if "%OPTION%"=="2" goto CAPACITOR_BUILD
if "%OPTION%"=="3" goto BUBBLEWRAP_BUILD
if "%OPTION%"=="4" goto START_SERVER
if "%OPTION%"=="5" goto END

:PWA_INFO
cls
echo ===============================================================================
echo     METHODE 1: PWA-INSTALLATION (EMPFOHLEN - KEIN APK-BUILD NÖTIG!)
echo ===============================================================================
echo.
echo Auf modernen Android-Smartphones ist KEINE manuell kompilierte APK nötig!
echo Da wir 'manifest-trainer.json' und 'sw.js' eingerichtet haben, kann jeder
echo Spieler die App mit 1 Klick als vollwertige native App installieren:
echo.
echo 1. Starte den Server (start.bat).
echo 2. Lass deine Spieler im WLAN den QR-Code auf 'download.html' scannen
echo    oder schicke ihnen den Link: http://[DEINE-IP]:3000/trainer.html
echo 3. In Google Chrome auf Android:
echo    - Auf die 3 Punkte (⋮) oben rechts tippen
echo    - Auf "App installieren" oder "Zum Startbildschirm hinzufügen" tippen.
echo 4. Die App hat danach ein eigenes Pokéball-Icon auf dem Handy, läuft im Vollbild
echo    ohne Browser-Leiste und synchronisiert in Echtzeit mit deinem DM Screen!
echo.
pause
goto END

:CAPACITOR_BUILD
cls
echo ===============================================================================
echo     METHODE 2: NATIVE ANDROID APK MIT CAPACITOR BAUEN
echo ===============================================================================
echo.
echo Prüfe Node.js und npm...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [FEHLER] Node.js wurde nicht gefunden. Bitte installiere Node.js!
    pause
    goto END
)

echo Installiere Capacitor Abhängigkeiten...
call npm install --save @capacitor/core @capacitor/cli @capacitor/android

if not exist "capacitor.config.json" (
    echo Erstelle Capacitor Konfiguration...
    call npx cap init "Pokemon Trainer" "com.pokemon.pnp.trainer" --web-dir "."
)

if not exist "android" (
    echo Füge Android-Plattform hinzu...
    call npx cap add android
)

echo Synchronisiere Web-Assets mit dem Android-Projekt...
call npx cap copy android

echo.
echo ===============================================================================
echo Android-Projekt wurde erfolgreich in './android' eingerichtet!
echo.
echo Um die APK jetzt zu kompilieren:
echo 1. Öffne Android Studio: npx cap open android
echo 2. Klicke auf 'Build' -> 'Build Bundle(s) / APK(s)' -> 'Build APK(s)'
echo 3. Die fertige .apk Datei liegt danach in:
echo    ./android/app/build/outputs/apk/debug/app-debug.apk
echo.
echo Diese Datei kannst du per WhatsApp, Discord oder USB an deine Spieler schicken!
echo ===============================================================================
pause
goto END

:BUBBLEWRAP_BUILD
cls
echo ===============================================================================
echo     METHODE 3: BUBBLEWRAP CLI (GOOGLE PWA TO APK)
echo ===============================================================================
echo.
echo Bubblewrap konvertiert PWA-Manifeste direkt in eine Android APK.
echo Benötigt: Java JDK und Android SDK.
echo.
echo Starte Bubblewrap CLI...
call npx @bubblewrap/cli init --manifest=http://localhost:3000/manifest-trainer.json
pause
goto END

:START_SERVER
cls
echo Starte Server...
call start.bat
goto END

:END
echo.
echo Auf Wiedersehen!
