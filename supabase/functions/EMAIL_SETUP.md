# Konfiguracja Email - Postmark zamiast Resend.com

## Opis zmian

Zaktualizowano system powiadomień email, aby używać **Postmark** zamiast Resend.com zgodnie z wymaganiami.

## Zmiany w notify-new-diagnosis

### ✅ Usunięto
- Zależność od `RESEND_API_KEY`
- Integrację z API Resend.com
- Konfigurację Resend

### ✅ Dodano  
- Integrację z Postmark API
- Konfigurację środowiska dla Postmark
- Lepsze logowanie i obsługę błędów
- Tracking otwarć i kliknięć w emailach

## Konfiguracja środowiska

### Wymagane zmienne środowiskowe

Dodaj następujące zmienne do Supabase Edge Functions:

```bash
# Postmark Configuration
POSTMARK_SERVER_TOKEN=your_postmark_server_token
FROM_EMAIL=noreply@byteclinic.pl
FROM_NAME=ByteClinic
ADMIN_EMAIL=admin@byteclinic.pl
```

### Instrukcja konfiguracji Postmark

1. **Utwórz konto Postmark**
   - Przejdź do [postmarkapp.com](https://postmarkapp.com)
   - Utwórz nowe konto lub zaloguj się

2. **Skonfiguruj serwer**
   - Utwórz nowy serwer w Postmark
   - Skopiuj Server Token

3. **Skonfiguruj domenę**
   - Zweryfikuj domenę `byteclinic.pl`
   - Skonfiguruj SPF i DKIM rekordy

4. **Ustaw w Supabase**
   ```
   supabase secrets set POSTMARK_SERVER_TOKEN=your_token_here
   supabase secrets set FROM_EMAIL=noreply@byteclinic.pl
   supabase secrets set FROM_NAME=ByteClinic
   supabase secrets set ADMIN_EMAIL=admin@byteclinic.pl
   ```

## Wdrożenie

### 1. Wdróż funkcję
```bash
supabase functions deploy notify-new-diagnosis --no-verify-jwt
```

### 2. Przetestuj
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/notify-new-diagnosis' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "record": {
      "id": "test-123",
      "name": "Jan Kowalski",
      "email": "test@example.com",
      "phone": "123456789",
      "device": "iPhone 13",
      "message": "Ekran nie działa",
      "created_at": "2025-12-03T14:42:52.449Z"
    }
  }'
```

## Struktura emaila

Email wysyłany przez funkcję zawiera:
- **Nagłówek**: Numer zgłoszenia i typ urządzenia
- **Dane klienta**: Imię, email, telefon
- **Szczegóły urządzenia**: Typ i model
- **Opis problemu**: Szczegółowy opis
- **Link do panelu**: Bezpośredni link do administracji

## Monitorowanie

Funkcja loguje:
- ✅ Wysłanie emaila (MessageID z Postmark)
- ❌ Błędy API Postmark
- 📊 Statystyki dostarczenia

## Bezpieczeństwo

- **TLS/SSL**: Wszystkie połączenia szyfrowane
- **Webhook verification**: Możliwość weryfikacji źródła
- **Rate limiting**: Automatyczne przez Postmark
- **Bounce handling**: Automatyczne przez Postmark

## Zalety Postmark vs Resend

| Cecha | Postmark | Resend |
|-------|----------|--------|
| Deliverability | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Pricing | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| API Documentation | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Transactional Focus | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Analytics | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## Troubleshooting

### Email nie wysyła się
1. Sprawdź logi funkcji w Supabase
2. Zweryfikuj Server Token w Postmark
3. Sprawdź status serwera w Postmark dashboard

### Błędy Postmark
- `401 Unauthorized`: Nieprawidłowy Server Token
- `422 Unprocessable`: Błędny format emaila
- `429 Too Many Requests`: Przekroczono limit

### Debug
```bash
# Sprawdź logi funkcji
supabase functions logs notify-new-diagnosis

# Sprawdź dostarczenie w Postmark
# Zaloguj się do Postmark dashboard
```

## Następne kroki

1. ✅ Funkcja notify-new-diagnosis zaktualizowana
2. ⏳ Aktualizacja pozostałych funkcji email
3. ⏳ Testy end-to-end
4. ⏳ Migracja danych konfiguracyjnych
5. ⏳ Monitoring produkcyjny