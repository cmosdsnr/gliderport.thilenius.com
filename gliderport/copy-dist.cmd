@echo off
REM copy everything under dist\ into the UNC share
xcopy /E /I /Y dist\* \\buddbliss\passport\gliderport\dist\
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to copy files to \\buddbliss\passport\gliderport\dist\
    exit /b 1
)