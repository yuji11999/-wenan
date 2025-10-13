@echo off
setlocal

REM 获取脚本所在的绝对路径
set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"

echo ====================================
echo Starting Short Video Copywriting System
echo ====================================
echo Script directory: %SCRIPT_DIR%
echo Backend directory: %BACKEND_DIR%
echo Frontend directory: %FRONTEND_DIR%
echo ====================================
echo.

REM 检查目录是否存在
if not exist "%BACKEND_DIR%" (
    echo ERROR: Backend directory not found!
    echo Expected path: %BACKEND_DIR%
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%" (
    echo ERROR: Frontend directory not found!
    echo Expected path: %FRONTEND_DIR%
    pause
    exit /b 1
)

REM Kill processes on port 3001 and 3002
echo Checking ports...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo Killing process on port 3001...
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002 ^| findstr LISTENING') do (
    echo Killing process on port 3002...
    taskkill /F /PID %%a >nul 2>&1
)

echo Waiting for ports to be released...
timeout /t 2 >nul

REM Prepare backend
echo.
echo ====================================
echo Preparing backend...
echo ====================================

REM 切换到后端目录
pushd "%BACKEND_DIR%"
echo Current directory: %CD%

REM 检查 .env 文件
if not exist .env (
    echo .env file not found, creating...
    if exist env-config.txt (
        copy env-config.txt .env >nul
        echo .env file created from env-config.txt
    ) else (
        echo ERROR: Neither .env nor env-config.txt found!
        echo Please configure database connection first.
        popd
        pause
        exit /b 1
    )
)

REM 检查 package.json
if not exist package.json (
    echo ERROR: package.json not found in backend directory!
    echo Current directory: %CD%
    popd
    pause
    exit /b 1
)

echo Installing backend dependencies...
call npm install --no-audit --no-fund

echo Generating Prisma Client...
call npx prisma generate

echo Syncing database...
call npx prisma db push

REM 返回原目录
popd

REM Start backend
echo.
echo ====================================
echo Starting backend on port 3002...
echo ====================================
start "Backend-3002" cmd /c "cd /d "%BACKEND_DIR%" && echo Backend starting in %CD% && npm run start:dev"

echo Waiting for backend to start...
timeout /t 5 >nul

REM Prepare frontend
echo.
echo ====================================
echo Preparing frontend...
echo ====================================

REM 切换到前端目录
pushd "%FRONTEND_DIR%"
echo Current directory: %CD%

REM 检查 package.json
if not exist package.json (
    echo ERROR: package.json not found in frontend directory!
    echo Current directory: %CD%
    popd
    pause
    exit /b 1
)

if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install --no-audit --no-fund
)

REM 返回原目录
popd

REM Start frontend
echo.
echo ====================================
echo Starting frontend on port 3001...
echo ====================================
start "Frontend-3001" cmd /c "cd /d "%FRONTEND_DIR%" && echo Frontend starting in %CD% && npm run dev"

echo Waiting for frontend to start...
timeout /t 5 >nul

REM Open browser
echo.
echo Opening browser...
start http://localhost:3001/login

echo.
echo ====================================
echo Services started successfully!
echo ====================================
echo Backend: http://localhost:3002
echo Frontend: http://localhost:3001
echo API Docs: http://localhost:3002/api-docs
echo.
echo Login credentials:
echo Username: admin
echo Password: admin123
echo ====================================
echo.
echo Press any key to exit this window...
echo Note: Closing this window will NOT stop the services.
echo.
pause >nul
endlocal
