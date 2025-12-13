# 🚀 Uruchomienie optymalizacji opóźnień powiadomień ByteClinic
# Wersja PowerShell dla Windows 11

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🚀 URUCHAMIAM OPTYMALIZACJĘ OPOŹNIEŃ POWIADOMIEŃ" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Monitor będzie uruchamiany co 1 minutę" -ForegroundColor Yellow
Write-Host "Aby zatrzymać: Ctrl+C w tym oknie" -ForegroundColor Yellow
Write-Host ""
Write-Host "Logi będą zapisywane w: monitor-powiadomien.log" -ForegroundColor Yellow
Write-Host ""

# Potwierdzenie uruchomienia
$response = Read-Host "Czy chcesz kontynuować? (t/n)"
if ($response -ne "t" -and $response -ne "T") {
    Write-Host "Anulowano." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Rozpoczynam monitorowanie..." -ForegroundColor Green
Write-Host ""

# Pętla nieskończona
while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] Uruchamiam monitor powiadomień..." -ForegroundColor Blue
    
    try {
        # Uruchom monitor
        bash monitor-powiadomien.sh
        
        Write-Host ""
        Write-Host "[$timestamp] Czekam 60 sekund do następnego sprawdzenia..." -ForegroundColor Gray
        Write-Host ""
        
        # Czekaj 60 sekund
        Start-Sleep -Seconds 60
        
    } catch {
        Write-Host "[$timestamp] Błąd: $_" -ForegroundColor Red
        Write-Host "Czekam 30 sekund przed kolejną próbą..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    }
}