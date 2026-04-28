@echo off
cd /d "%~dp0"
set MSG=%~1
if "%MSG%"=="" set MSG=wip
git add -A
git diff --cached --quiet || git commit -m "%MSG%"
git push origin HEAD
