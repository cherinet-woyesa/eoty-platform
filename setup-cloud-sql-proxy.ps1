$ErrorActionPreference = "Stop"

Write-Host "Downloading Cloud SQL Auth Proxy..."
$proxyUrl = "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.13.0/cloud-sql-proxy.windows.amd64.exe"
$proxyPath = ".\cloud-sql-proxy.exe"

Invoke-WebRequest -Uri $proxyUrl -OutFile $proxyPath

Write-Host "Cloud SQL Auth Proxy downloaded to $proxyPath"
Write-Host "To start the proxy, run:"
Write-Host ".\cloud-sql-proxy.exe eotconnect:us-central1:eoty-platform-db"
Write-Host ""
Write-Host "You will need to authenticate with Google Cloud."
