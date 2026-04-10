$date = Get-Date -Format "MMMM dd, yyyy"
Write-Host "=== Generating all docs (Generated: $date) ===" -ForegroundColor Cyan

$root = $PSScriptRoot
$projects = @("gliderport", "gliderportFrontEnd", "gp_pi3_server")

foreach ($project in $projects) {
    Write-Host "`n[$project]" -ForegroundColor Yellow
    Push-Location "$root\$project"
    yarn exec typedoc --skipErrorChecking --customFooterHtml "Generated: $date"
    .\copy-docs.bat
    Pop-Location
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
