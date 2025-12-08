# Test API Kontaktowego - ByteClinic
# PowerShell Script

$SUPABASE_URL = "https://wllxicmacmfzmqdnovhp.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbHhpY21hY21mem1xZG5vdmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDA4MjcsImV4cCI6MjA4MDUxNjgyN30.9uV-EYGP8JvVuqmEPIRyTG7hCHPaKabc8MxnxzHl8ok"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test API Kontaktowego - ByteClinic" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Konfiguracja:" -ForegroundColor Yellow
Write-Host "  URL: $SUPABASE_URL"
Write-Host "  API Key: $($SUPABASE_KEY.Substring(0,20))..."
Write-Host ""

$endpoints = @(
    "notify-new-diagnosis",
    "send-contact",
    "contact",
    "notify-system"
)

$testData = @{
    to = "test@example.com"
    subject = "Test zgłoszenia kontaktowego"
    data = @{
        id = "TKT-TEST-$(Get-Date -Format 'yyyyMMddHHmmss')"
        name = "Jan Testowy"
        email = "test@example.com"
        phone = "+48 123 456 789"
        device = "Laptop"
        message = "To jest testowa wiadomość z API"
        category = "repair_request"
        priority = "medium"
        urgencyLevel = "normal"
        subject = "Test zgłoszenia"
        createdAt = (Get-Date).ToString("o")
        clientInfo = @{
            userAgent = "PowerShell Test Script"
            language = "pl-PL"
            platform = "PowerShell"
            timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
        }
    }
} | ConvertTo-Json -Depth 10

Write-Host "Testowanie endpointów..." -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$results = @()

foreach ($endpoint in $endpoints) {
    $url = "$SUPABASE_URL/functions/v1/$endpoint"
    
    Write-Host "[$($endpoints.IndexOf($endpoint) + 1)/$($endpoints.Count)] Testowanie: $endpoint" -ForegroundColor Cyan
    Write-Host "  URL: $url" -ForegroundColor Gray
    
    try {
        $headers = @{
            "Authorization" = "Bearer $SUPABASE_KEY"
            "Content-Type" = "application/json"
            "apikey" = $SUPABASE_KEY
        }
        
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $testData -ErrorAction Stop
        
        $stopwatch.Stop()
        $duration = $stopwatch.ElapsedMilliseconds
        
        Write-Host "  ⏱️  Czas: ${duration}ms" -ForegroundColor Gray
        Write-Host "  📊 Status: $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor Green
        Write-Host "  📥 Response: $($response.Content.Substring(0, [Math]::Min(100, $response.Content.Length)))..." -ForegroundColor Gray
        Write-Host "  ✅ SUKCES - Endpoint działa!" -ForegroundColor Green
        
        $successCount++
        $results += @{
            endpoint = $endpoint
            status = $response.StatusCode
            success = $true
            duration = $duration
        }
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $statusDescription = $_.Exception.Response.StatusDescription
        
        Write-Host "  📊 Status: $statusCode $statusDescription" -ForegroundColor Red
        Write-Host "  ❌ BŁĄD" -ForegroundColor Red
        
        if ($statusCode -eq 404) {
            Write-Host "  ℹ️  Endpoint nie istnieje" -ForegroundColor Yellow
        } elseif ($statusCode -eq 403) {
            Write-Host "  ℹ️  Brak autoryzacji - sprawdź API key" -ForegroundColor Yellow
        } elseif ($statusCode -eq 500) {
            Write-Host "  ℹ️  Błąd serwera - sprawdź logi Edge Function" -ForegroundColor Yellow
        }
        
        $results += @{
            endpoint = $endpoint
            status = $statusCode
            success = $false
            error = $_.Exception.Message
        }
    }
    
    Write-Host ""
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Podsumowanie:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Przetestowano: $($endpoints.Count) endpointów" -ForegroundColor White
Write-Host "Sukces: $successCount" -ForegroundColor Green
Write-Host "Błędy: $($endpoints.Count - $successCount)" -ForegroundColor Red
Write-Host ""

if ($successCount -eq 0) {
    Write-Host "❌ Wszystkie endpointy zwróciły błąd!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Możliwe przyczyny:" -ForegroundColor Yellow
    Write-Host "  1. Edge Functions nie są wdrożone w Supabase" -ForegroundColor White
    Write-Host "     → Wdróż: supabase functions deploy" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Błędny API key" -ForegroundColor White
    Write-Host "     → Sprawdź .env i Supabase Dashboard" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Problem z CORS" -ForegroundColor White
    Write-Host "     → Dodaj domenę w Supabase Dashboard → API → CORS" -ForegroundColor Gray
} elseif ($successCount -lt $endpoints.Count) {
    Write-Host "⚠️  Niektóre endpointy działają, inne nie" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Działające endpointy:" -ForegroundColor Green
    foreach ($result in $results | Where-Object { $_.success }) {
        Write-Host "  ✅ $($result.endpoint) - Status $($result.status)" -ForegroundColor Green
    }
    Write-Host ""
    Write-Host "Niedziałające endpointy:" -ForegroundColor Red
    foreach ($result in $results | Where-Object { -not $_.success }) {
        Write-Host "  ❌ $($result.endpoint) - Status $($result.status)" -ForegroundColor Red
    }
} else {
    Write-Host "✅ Wszystkie endpointy działają poprawnie!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Aby sprawdzić w przeglądarce:" -ForegroundColor Yellow
Write-Host "  1. Otwórz: test-contact-api.html" -ForegroundColor White
Write-Host "  2. Otwórz DevTools (F12) → Network" -ForegroundColor White
Write-Host "  3. Kliknij 'Wyślij zgłoszenie'" -ForegroundColor White
Write-Host "  4. Zobacz request URL, status, response" -ForegroundColor White
Write-Host ""
Write-Host "Pełna instrukcja: INSTRUKCJA_TESTOWANIA_API.md" -ForegroundColor Cyan
Write-Host ""
