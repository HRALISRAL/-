@echo off
title EventFlow Production Server
chcp 65001 > nul
cls

echo ===================================================
echo ✨ EventFlow - הפעלת מערכת ייצור (Production)
echo ===================================================
echo.
echo מפעיל את השרת המאוחד בפורט 5000...
echo (שרת זה מריץ גם את ה-Backend וגם את ה-Frontend במקביל)
echo.

:: Start only the backend node server (which serves the compiled dist client)
cd /d "%~dp0server"
start "EventFlow Server (Port 5000)" cmd /k "node index.js"

echo ממתין לעליית השרת...
timeout /t 3 /nobreak > nul

echo.
echo פותח את המערכת בדפדפן...
start http://localhost:5000

echo.
echo ===================================================
echo ✅ המערכת פועלת בהצלחה!
echo ===================================================
echo * כתובת המערכת: http://localhost:5000
echo.
echo לעצירת המערכת, סגור את החלון של "EventFlow Server (Port 5000)".
echo.
pause
