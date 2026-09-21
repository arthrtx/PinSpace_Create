@echo off
title PinSpace Create - Servidor Estatico
cd /d "%~dp0"

rem Fecha um servidor antigo que ainda esteja na porta 8000,
rem senao o browser liga-se ao servidor antigo (design antigo).
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

rem Escolhe um motor funcional, por ordem: python, py, uv, e por fim o
rem PowerShell (ja vem no Windows - nao precisa de instalar nada).
set "PYCMD="
set "PSMODE="
python -c "import sys" >nul 2>&1 && set "PYCMD=python"
if not defined PYCMD py -c "import sys" >nul 2>&1 && set "PYCMD=py"
if not defined PYCMD uv run --no-project python -c "import sys" >nul 2>&1 && set "PYCMD=uv run --no-project python"
if not defined PYCMD set "PSMODE=1"

start "" http://localhost:8000/

if defined PSMODE (
    echo Servidor iniciado em http://localhost:8000
    echo Sem Python nem uv nesta maquina - a usar o PowerShell do Windows.
    echo Prima Ctrl+C para parar.
    powershell -NoProfile -ExecutionPolicy Bypass -File server.ps1
) else (
    echo Servidor iniciado em http://localhost:8000
    echo Os quadros publicos usam o Supabase - ver js/supabase-config.js.
    echo Prima Ctrl+C para parar.
    %PYCMD% server.py
)
pause