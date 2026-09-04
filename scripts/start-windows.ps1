$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$ImageName = "prelegal"
$ContainerName = "prelegal"
$Port = 8000

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is required but was not found on PATH. Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker is installed but not running. Start Docker Desktop and try again."
    exit 1
}

$EnvFile = Join-Path $RepoRoot ".env"
$EnvArgs = @()
if (Test-Path $EnvFile) {
    $EnvArgs = @("--env-file", $EnvFile)
} else {
    Write-Warning "$EnvFile not found. Continuing without it (OPENAI_API_KEY will be unset)."
}

Write-Host "Building $ImageName image..."
docker build -t $ImageName $RepoRoot

$existing = docker ps -a --format "{{.Names}}" | Select-String -Pattern "^$ContainerName$"
if ($existing) {
    Write-Host "Removing existing $ContainerName container..."
    docker rm -f $ContainerName | Out-Null
}

Write-Host "Starting $ContainerName on http://localhost:$Port ..."
docker run -d --name $ContainerName -p "${Port}:8000" @EnvArgs $ImageName | Out-Null

Write-Host "Prelegal is running at http://localhost:$Port"
