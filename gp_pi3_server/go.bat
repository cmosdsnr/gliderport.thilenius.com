@echo off
REM Commit gp_pi3_server changes from repo root.
REM Run from gp_pi3_server\ — script CDs to repo root automatically.

cd /d "%~dp0.."

set MSG=%~1
if "%MSG%"=="" set MSG=wip

git add gp_pi3_server
git diff --cached --quiet || git commit -m "%MSG%"
