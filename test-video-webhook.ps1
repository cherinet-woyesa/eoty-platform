# PowerShell script to test Mux video webhook
# Usage: .\test-video-webhook.ps1 -LessonId 78

param(
    [Parameter(Mandatory=$true)]
    [int]$LessonId,
    
    [string]$BaseUrl = "http://localhost:5000",
    
    [string]$Token = ""
)

Write-Host "🧪 Testing Mux Video Webhook for Lesson $LessonId" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# If no token provided, try to login
if ([string]::IsNullOrEmpty($Token)) {
    Write-Host "📝 No token provided. Please login first..." -ForegroundColor Yellow
    Write-Host "Enter email: " -NoNewline
    $email = Read-Host
    Write-Host "Enter password: " -NoNewline
    $password = Read-Host -AsSecureString
    $passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
    
    $loginBody = @{
        email = $email
        password = $passwordPlain
    } | ConvertTo-Json
    
    try {
        $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
        $Token = $loginResponse.token
        Write-Host "✅ Login successful!" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "❌ Login failed: $_" -ForegroundColor Red
        exit 1
    }
}

# Test the webhook
Write-Host "🔍 Testing webhook for lesson $LessonId..." -ForegroundColor Cyan

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$body = @{
    lessonId = $LessonId
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/videos/mux/webhook/test" -Method Post -Headers $headers -Body $body
    
    Write-Host "✅ Test completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
} catch {
    Write-Host "❌ Test failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "💡 Check your backend console for detailed logs" -ForegroundColor Yellow
