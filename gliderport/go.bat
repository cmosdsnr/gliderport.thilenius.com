@echo off
REM Deploy the gliderport Express backend to Dokku.
REM Run from gliderport\ — script CDs to repo root automatically.

cd /d "%~dp0.."

set MSG=%~1
if "%MSG%"=="" set MSG=wip

git add gliderport
git diff --cached --quiet || git commit -m "%MSG%"

for /f %%i in ('git subtree split --prefix gliderport HEAD') do git push dokku %%i:master --force
