@echo off
title Manav Rachna ICCF Portal Launcher
echo ===================================================
echo   Starting Manav Rachna ICCF Web Portal...
echo ===================================================
cd /d "%~dp0"

echo [1/2] Starting Backend Server (Port 5000)...
start "ICCF Backend API" cmd /k "npm --prefix server run dev"

echo [2/2] Starting Frontend Vite Server (Port 3000)...
start "ICCF Frontend" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul
echo Opening Portal in browser...
start http://localhost:3000/
echo.
echo Both servers are running!
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo Press any key to exit this launcher window...
pause >nul
