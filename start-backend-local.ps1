$env:DB_HOST = "127.0.0.1"
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "Cherinet4!"
$env:DB_NAME = "eoty_platform"
$env:PORT = "5000"
$env:NODE_ENV = "development"

Set-Location backend
node scripts/start.js