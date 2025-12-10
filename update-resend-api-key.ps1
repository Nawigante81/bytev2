# Skrypt PowerShell do aktualizacji klucza API Resend w Supabase
# Użycie: .\update-resend-api-key.ps1

Write-Host "🔑 Aktualizacja klucza API Resend w Supabase" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Nowy klucz API
$NEW_API_KEY = "re_Gnup8gWT_iscYWzBPSfrwwD1yzGNaqgUA"

# Sprawdź czy Supabase CLI jest zainstalowane
$supabaseCLI = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCLI) {
    Write-Host "❌ Supabase CLI nie jest zainstalowane" -ForegroundColor Red
    Write-Host ""
    Write-Host "📦 Instalacja Supabase CLI:" -ForegroundColor Yellow
    Write-Host "   npm install -g supabase"
    Write-Host ""
    Write-Host "Lub instrukcja manualna poniżej..." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "📝 INSTRUKCJA MANUALNA (przez Dashboard):" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "1. Otwórz Supabase Dashboard:"
Write-Host "   https://app.supabase.com/project/wllxicmacmfzmqdnovhp/settings/functions" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Przejdź do Edge Functions > Configuration"
Write-Host ""
Write-Host "3. Dodaj/Zaktualizuj następujące secrets:"
Write-Host ""
Write-Host "   RESEND_API_KEY = $NEW_API_KEY" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. (Opcjonalnie) Dodaj też:"
Write-Host "   MAIL_FROM = noreply@byteclinic.pl"
Write-Host "   ADMIN_EMAIL = admin@byteclinic.pl"
Write-Host ""
Write-Host "5. Zapisz zmiany"
Write-Host ""
Write-Host "6. Zrestartuj edge functions (automatyczne po zapisie)"
Write-Host ""

if ($supabaseCLI) {
    Write-Host ""
    Write-Host "💻 LUB użyj Supabase CLI:" -ForegroundColor Green
    Write-Host "==========================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Najpierw zaloguj się (jeśli jeszcze nie):"
    Write-Host "  supabase login" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Następnie ustaw secret:"
    Write-Host "  supabase secrets set RESEND_API_KEY=$NEW_API_KEY --project-ref wllxicmacmfzmqdnovhp" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Opcjonalnie dodaj pozostałe:"
    Write-Host "  supabase secrets set MAIL_FROM=noreply@byteclinic.pl --project-ref wllxicmacmfzmqdnovhp" -ForegroundColor Cyan
    Write-Host "  supabase secrets set ADMIN_EMAIL=admin@byteclinic.pl --project-ref wllxicmacmfzmqdnovhp" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "✅ Po zaktualizowaniu secrets:" -ForegroundColor Green
Write-Host "   1. Sprawdź logi edge functions"
Write-Host "   2. Przetestuj wysyłanie emaili"
Write-Host "   3. Uruchom: node test-auto-notifications.js"
Write-Host ""

# Opcjonalnie - otwórz Dashboard
$openDashboard = Read-Host "Czy chcesz otworzyć Supabase Dashboard teraz? (t/n)"
if ($openDashboard -eq "t" -or $openDashboard -eq "T") {
    Start-Process "https://app.supabase.com/project/wllxicmacmfzmqdnovhp/settings/functions"
}