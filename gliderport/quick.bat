 @echo off
REM assume this script lives in gliderportFrontEnd\

REM Set default commit message
set COMMIT_MSG=wip
IF NOT "%~1"=="" set COMMIT_MSG=%~1

REM 1) build the front-end
call yarn build
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Front-end build failed. Aborting.
    exit /b 1
)

REM 2) Copy built files to shared folder
xcopy /E /I /Y dist\* \\buddbliss\passport\gliderport\dist\
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to copy files to \\buddbliss\passport\gliderport\dist\
    exit /b 1
)

@REM ssh dokku@buddbliss.com ps:restart gliderport
@REM IF %ERRORLEVEL% NEQ 0 (
@REM     echo.
@REM     echo [ERROR] Failed to restart the Dokku app.
@REM     exit /b 1
@REM )

REM 3) stage & commit
git add .
git commit -m "%COMMIT_MSG%"
