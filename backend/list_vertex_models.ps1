$token = gcloud auth print-access-token
$project = "eotconnect"
$location = "us-east1"
$url = "https://$location-aiplatform.googleapis.com/v1/projects/$project/locations/$location/publishers/google/models"

Write-Host "Listing models for Project: $project in $location"
Write-Host "URL: $url"

try {
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers @{ "Authorization" = "Bearer $token" }
    
    if ($response.models) {
        Write-Host "✅ Found $($response.models.Count) models."
        $response.models | ForEach-Object { 
            if ($_.name -match "gemini") {
                Write-Host " - $($_.name)" 
            }
        }
    } else {
        Write-Host "⚠️ No models found in response."
    }
} catch {
    Write-Host "❌ Error listing models:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())"
    }
}
