@echo off
title EventFlow Runner
chcp 65001 > nul
cls

echo ===================================================
echo ✨ EventFlow - מפעיל מערכת אוטומטי
echo ===================================================
echo.
echo מפעיל את שרת ה-Backend (API)...
start "EventFlow Backend (Port 5000)" cmd /k "cd /d "%~dp0server" && node index.js"

echo.
echo מפעיל את שרת ה-Frontend (Vite)...
start "EventFlow Frontend (Port 5173)" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo ממתין לעליית השרתים...
timeout /t 3 /nobreak > nul

echo.
echo פותח את הדפדפן בכתובת המערכת...
start http://localhost:5173

echo.
echo ===================================================
echo ✅ המערכת פועלת כעת ברקע!
echo ===================================================
echo * שרת ה-API רץ בפורט 5000
echo * שרת ה-Frontend רץ בפורט 5173
echo.
echo כדי לעצור את המערכת, פשוט סגור את שני חלונות ה-CMD 
echo שנפתחו (EventFlow Backend ו-EventFlow Frontend).
echo.
echo לחיצה על מקש כלשהו תסגור את החלון הנוכחי...
pause > nul
