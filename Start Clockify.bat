@echo off
title Clockify BILD-AI - close this window to stop the app
cd /d "%~dp0"

set "PY=%LOCALAPPDATA%\clockify-bild-ai\venv\Scripts\python.exe"
if not exist "%PY%" (
    echo Could not find the app's Python environment at:
    echo   %PY%
    echo Ask Claude to set it up again.
    pause
    exit /b 1
)

"%PY%" app.py
if errorlevel 1 pause
