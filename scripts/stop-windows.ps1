$ErrorActionPreference = "Stop"
$ContainerName = "prelegal"

$existing = docker ps -a --format "{{.Names}}" | Select-String -Pattern "^$ContainerName$"
if ($existing) {
    Write-Host "Stopping $ContainerName..."
    docker rm -f $ContainerName | Out-Null
    Write-Host "Stopped."
} else {
    Write-Host "$ContainerName is not running."
}
