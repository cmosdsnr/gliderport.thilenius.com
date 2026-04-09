@echo off
REM Build the frontend, copy dist to network share, commit from repo root.
REM Run from gliderportFrontEnd\ — script CDs to repo root automatically.

cd /d "%~dp0"

set MSG=%~1
if "%MSG%"=="" set MSG=wip

REM 1) Build
call yarn build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Front-end build failed. Aborting.
    exit /b 1
)

REM 2) Copy built files to shared folder
xcopy /E /I /Y dist\* \\buddbliss\passport\gliderport\frontend\
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to copy files to \\buddbliss\passport\gliderport\frontend\
    exit /b 1
)

REM 3) Commit from repo root
cd /d "%~dp0.."
git add gliderportFrontEnd
git diff --cached --quiet || git commit -m "%MSG%"
