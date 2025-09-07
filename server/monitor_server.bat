@echo off
title MIT Reddit Server Monitor
color 0A
echo ================================================
echo      MIT REDDIT SERVER MONITOR
echo      Supabase PostgreSQL Backend  
echo ================================================
echo.

:MONITOR_LOOP
echo [%TIME%] Checking server status...

:: Check if server is running on port 5000
netstat -ano | findstr ":5000" >nul 2>&1
if %errorlevel% == 0 (
    echo [%TIME%] ✅ Server is RUNNING on port 5000
    
    :: Test API health endpoint
    powershell -Command "try { $response = Invoke-RestMethod -Uri 'http://localhost:5000/api/health' -TimeoutSec 5; if ($response.database -eq 'connected') { Write-Host '[%TIME%] ✅ Database: CONNECTED' } else { Write-Host '[%TIME%] ⚠️ Database: Unknown status' } } catch { Write-Host '[%TIME%] ❌ API health check failed' }" 2>nul
) else (
    echo [%TIME%] ❌ Server is NOT RUNNING - Attempting restart...
    cd "c:\Users\Ryan Gupta\Desktop\MIT_RED\server"
    start /min "" node src/server.js
    timeout /t 5 >nul
)

echo.
echo Press Ctrl+C to stop monitoring...
timeout /t 30 >nul
goto MONITOR_LOOP
