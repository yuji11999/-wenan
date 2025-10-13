@echo off
cd /d "%~dp0frontend"
echo Starting frontend service...
echo.
npm run dev
pause

