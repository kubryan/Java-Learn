@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem Node.js installer usually places node.exe and corepack.cmd here.
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo [JavaBase] Node.js is not installed or is not in PATH.
  echo Install Node.js LTS from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)

set "COREPACK_CMD="
for /f "delims=" %%C in ('where corepack.cmd 2^>nul') do if not defined COREPACK_CMD set "COREPACK_CMD=%%C"
if not defined COREPACK_CMD if exist "%ProgramFiles%\nodejs\corepack.cmd" set "COREPACK_CMD=%ProgramFiles%\nodejs\corepack.cmd"
if not defined COREPACK_CMD if exist "%ProgramFiles(x86)%\nodejs\corepack.cmd" set "COREPACK_CMD=%ProgramFiles(x86)%\nodejs\corepack.cmd"

if not defined COREPACK_CMD (
  echo [JavaBase] Corepack is not available.
  echo Please reinstall Node.js LTS with Corepack included.
  pause
  exit /b 1
)

 echo [JavaBase] Using Corepack: %COREPACK_CMD%
call "%COREPACK_CMD%" pnpm --version
if errorlevel 1 (
  echo [JavaBase] Corepack could not start pnpm.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [JavaBase] Installing project dependencies...
  call "%COREPACK_CMD%" pnpm install
  if errorlevel 1 (
    echo [JavaBase] Dependency installation failed.
    pause
    exit /b 1
  )
)

echo [JavaBase] Starting local knowledge workspace...
echo [JavaBase] Keep this window open while using the site.
echo [JavaBase] Open the URL shown by Vite, usually http://localhost:3000
call "%COREPACK_CMD%" pnpm dev
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo [JavaBase] Development server stopped with code %EXIT_CODE%.
pause
exit /b %EXIT_CODE%
