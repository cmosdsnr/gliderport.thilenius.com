@echo off
REM assume this script lives in gliderportFrontEnd\

REM 1) build the front-end
call yarn build
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Front-end build failed. Aborting.
    exit /b 1
)

REM 2) stage & commit
git add .
git commit -m "wip"

REM 3) switch to the back-end folder and run its script
cd ..\gliderport
call go.bat

REM 4) return to front-end (if you really need to)
cd ..\gliderportFrontEnd