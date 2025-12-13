<# 
  deploy.ps1 – automat do Supabase
  - sprawdza supabase CLI
  - opcjonalnie loguje
  - opcjonalnie linkuje projekt
  - robi supabase db push
  - deployuje wszystkie funkcje z supabase/functions/*
#>

$ErrorActionPreference = "Stop"

Write-Host "=== ByteClinic / Supabase deploy ===" -ForegroundColor Cyan
Write-Host ""

# -------------------------------
# 1. Sprawdzenie Supabase CLI
# -------------------------------
Write-Host "[1/5] Sprawdzam Supabase CLI..." -ForegroundColor Yellow
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCmd) {
    Write-Host "Supabase CLI nie znaleziony. Próba instalacji przez Scoop (Windows)..." -ForegroundColor Yellow

    # Sprawdź czy Scoop jest dostępny
    $scoopCmd = Get-Command scoop -ErrorAction SilentlyContinue
    if (-not $scoopCmd) {
        Write-Host "Scoop nie znaleziony. Próba instalacji Scoop..." -ForegroundColor Yellow
        
        # Sprawdź czy PowerShell ma uprawnienia do wykonywania skryptów
        $executionPolicy = Get-ExecutionPolicy
        if ($executionPolicy -eq "Restricted") {
            Write-Host "PowerShell Execution Policy jest Restricted. Uruchom jako administrator i wykonaj:" -ForegroundColor Red
            Write-Host "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Yellow
            exit 1
        }

        try {
            # Instalacja Scoop
            Invoke-Expression "& { [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://get.scoop.sh')) }"
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Instalacja Scoop nie powiodła się. Spróbuj ręcznie: https://scoop.sh/" -ForegroundColor Red
                exit 1
            }
            $scoopCmd = Get-Command scoop -ErrorAction SilentlyContinue
        } catch {
            Write-Host "Błąd instalacji Scoop: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "Spróbuj ręcznie zainstalować Supabase CLI: https://github.com/supabase/cli#install-the-cli" -ForegroundColor Yellow
            exit 1
        }
    }

    # Instaluj Supabase CLI przez Scoop
    try {
        scoop install supabase
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Instalacja Supabase CLI przez Scoop nie powiodła się." -ForegroundColor Red
            Write-Host "Spróbuj ręcznie: https://github.com/supabase/cli#install-the-cli" -ForegroundColor Yellow
            exit 1
        }
    } catch {
        Write-Host "Błąd instalacji Supabase CLI: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Spróbuj ręcznie: https://github.com/supabase/cli#install-the-cli" -ForegroundColor Yellow
        exit 1
    }

    $supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
    if (-not $supabaseCmd) {
        Write-Host "Supabase CLI nadal nie widoczny w PATH. Zrestartuj terminal i spróbuj ponownie." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Supabase CLI OK: $($supabaseCmd.Source)" -ForegroundColor Green
Write-Host ""

# -------------------------------
# 2. Logowanie do Supabase
# -------------------------------
Write-Host "[2/5] Logowanie do Supabase..." -ForegroundColor Yellow
$alreadyLoggedIn = Read-Host "Czy jesteś już zalogowany do Supabase CLI? (t/n, Enter = t)"

if ($alreadyLoggedIn -eq "" -or $alreadyLoggedIn -match '^[TtYy]') {
    Write-Host "Pomijam logowanie (zakładam, że już jesteś zalogowany)." -ForegroundColor DarkGray
} else {
    Write-Host "Otwieram proces logowania. Wejdź do panelu Supabase → Settings → Access Tokens, skopiuj token i wklej w CLI." -ForegroundColor DarkYellow
    supabase login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Logowanie nie powiodło się." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# -------------------------------
# 3. Linkowanie projektu
# -------------------------------
Write-Host "[3/5] Linkowanie projektu Supabase..." -ForegroundColor Yellow
$alreadyLinked = Read-Host "Czy ten folder jest już połączony z projektem (supabase link)? (t/n, Enter = t)"

if ($alreadyLinked -eq "" -or $alreadyLinked -match '^[TtYy]') {
    Write-Host "Pomijam supabase link (zakładam, że config jest OK)." -ForegroundColor DarkGray
} else {
    $projectRef = Read-Host "Podaj project ref (np. abcd1234efgh5678ijkl z URL projektu)"
    if ([string]::IsNullOrWhiteSpace($projectRef)) {
        Write-Host "Project ref jest wymagany." -ForegroundColor Red
        exit 1
    }

    supabase link --project-ref $projectRef
    if ($LASTEXITCODE -ne 0) {
        Write-Host "supabase link nie powiódł się." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# -------------------------------
# 4. Migracje bazy: supabase db push
# -------------------------------
Write-Host "[4/5] Wypychanie migracji: supabase db push" -ForegroundColor Yellow

try {
    supabase db push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "supabase db push zwrócił błąd (sprawdź migracje w supabase/migrations)." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Błąd podczas supabase db push: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "Migracje bazy wgrane poprawnie." -ForegroundColor Green
Write-Host ""

# -------------------------------
# 5. Deploy edge functions
# -------------------------------
Write-Host "[5/5] Deploy edge functions..." -ForegroundColor Yellow

$functionsRoot = Join-Path -Path (Get-Location) -ChildPath "supabase/functions"

if (-not (Test-Path $functionsRoot)) {
    Write-Host "Brak katalogu supabase/functions – pomijam deploy funkcji." -ForegroundColor DarkGray
} else {
    $functions = Get-ChildItem -Path $functionsRoot -Directory

    if ($functions.Count -eq 0) {
        Write-Host "Brak podkatalogów w supabase/functions – nie znaleziono funkcji do deployu." -ForegroundColor DarkGray
    } else {
        foreach ($fn in $functions) {
            $fnName = $fn.Name
            Write-Host "Deploy funkcji: $fnName" -ForegroundColor Cyan
            try {
                supabase functions deploy $fnName
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "Błąd przy deploy funkcji $fnName." -ForegroundColor Red
                    exit 1
                }
            } catch {
                $exceptionMessage = $_.Exception.Message
                Write-Host "Wyjątek przy deploy funkcji ${fnName}: ${exceptionMessage}" -ForegroundColor Red
                exit 1
            }
        }

        Write-Host "Wszystkie funkcje z supabase/functions zostały wdrożone." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== Deploy zakończony sukcesem ✅ ===" -ForegroundColor Green
Write-Host "Jeśli coś nie działa – sprawdź logi Supabase i .env w froncie." -ForegroundColor DarkGray
