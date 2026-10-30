@echo off
title Manav Rachna ICCF Portal Launcher
echo ===================================================
echo   Manav Rachna ICCF Portal Launcher & Health Guard
echo ===================================================
cd /d "%~dp0"

echo [1/3] Ensuring Port 3000 and 5000 are clean...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
  echo Freeing Port 3000 (PID %%a)...
  taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING 2^>nul') do (
  echo Freeing Port 5000 (PID %%a)...
  taskkill /f /pid %%a >nul 2>&1
)

echo [2/3] Launching Backend API Server (Port 5000)...
start "ICCF Backend API" cmd /k "cd /d \"%~dp0\" && npm --prefix server run dev"

echo [3/3] Launching Frontend Vite Server (Port 3000)...
start "ICCF Frontend" cmd /k "cd /d \"%~dp0\" && npm run dev"

echo Waiting for services to initialize...
timeout /t 4 /nobreak >nul

echo Opening Portal in default browser...
start http://localhost:3000/
echo.
echo ===================================================
echo   SUCCESS: Both services running continuously!
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:5000
echo   Keep the two popup cmd windows open while testing.
echo ===================================================
echo.
pause
