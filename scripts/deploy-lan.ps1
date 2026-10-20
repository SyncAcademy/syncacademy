# Keep frontend request contracts and API validation in the same release.
$ErrorActionPreference = 'Stop'
$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
$dockerPath = if ($dockerCommand) { $dockerCommand.Source } else { Join-Path $env:LOCALAPPDATA 'Programs/DockerDesktop/resources/bin/docker.exe' }
if (!(Test-Path -LiteralPath $dockerPath)) { throw 'Docker Desktop is required.' }
Push-Location (Join-Path $PSScriptRoot '..')
try {
    & $dockerPath compose build api web
    if ($LASTEXITCODE -ne 0) { throw 'Build failed; the running release was not changed.' }
    & $dockerPath compose up -d --wait api worker web
    if ($LASTEXITCODE -ne 0) { throw 'Deployment failed. Check docker compose logs before sharing the site.' }
} finally { Pop-Location }
