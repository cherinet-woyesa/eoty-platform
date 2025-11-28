$ErrorActionPreference = "Stop"

if (-not (Test-Path ".\cloud-sql-proxy.exe")) {
    Write-Host "Proxy executable not found. Running setup..."
    .\setup-cloud-sql-proxy.ps1
}

Write-Host "Starting Cloud SQL Auth Proxy..."
Write-Host "Please ensure you are logged in to gcloud (gcloud auth login) or have credentials."

.\cloud-sql-proxy.exe eotconnect:us-central1:eoty-platform-db --port 5432
