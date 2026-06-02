@echo off
title EventFlow - Automated Demo Video
cls

echo ===================================================
echo EventFlow - Automated Demo Video Script
echo ===================================================
echo.
echo Step 1: Installing Playwright dependencies...
echo.
call npm install playwright --no-audit --no-fund
if %ERRORLEVEL% neq 0 (
    echo Error installing Playwright.
    pause
    exit /b
)

echo.
echo Step 2: Installing Chromium browser...
call npx playwright install chromium
if %ERRORLEVEL% neq 0 (
    echo Error installing Chromium.
    pause
    exit /b
)

echo.
echo ===================================================
echo READY TO RUN AUTOMATED DEMO!
echo ===================================================
echo * Make sure your servers are running (run_servers.bat).
echo * Start your screen recorder now (Win + Alt + R).
echo.
echo Press any key to start the browser and run the flow...
pause > nul

echo Running simulation...
node demo_automation.js

echo.
echo ===================================================
echo Simulation finished!
echo ===================================================
pause
