@echo off
cd /d "%~dp0backend"
echo Starting backend service...
echo.
npm run start:dev
pause

