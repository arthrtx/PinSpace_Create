@echo off
title PinSpace Create — Servidor Local
cd /d "%~dp0"

rem Fecha um servidor antigo que ainda esteja na porta 8000,
rem senão o browser liga-se ao servidor antigo (design antigo).
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

start "" http://localhost:8000/
echo Servidor iniciado em http://localhost:8000
echo Se ainda vir o design antigo, faça Ctrl+F5 (recarregar sem cache).
echo Prima Ctrl+C para parar.
python server.py
pause