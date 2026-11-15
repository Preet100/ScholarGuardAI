@echo off
title ScholarGuard AI Platform
color 0B
cd /d "%~dp0"

where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python was not found in your system PATH!
    echo Please install Python 3.11 or higher and ensure 'Add to PATH' is checked.
    pause
    exit /b 1
)

python launch.py
pause
