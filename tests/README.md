# Instrukcja testowania aplikacji

## Instalacja

```bash
npm install
```

## Konfiguracja

1. Skopiuj `.env.example` do `.env.test`
2. Wypełnij wszystkie wymagane zmienne

## Uruchomienie testów

### Wszystkie testy (development)

```bash
npm run test:integration
```

### Testy produkcyjne

```bash
npm run test:integration:prod
```

### Tylko testy DNS

```bash
node tests/dns-checker.js yourdomain.com
```

### Testy frontendu

```bash
npm run test:frontend
```

## Interpretacja wyników

- ✓ (zielony) - Test przeszedł
- ⚠ (żółty) - Ostrzeżenie, wymaga uwagi
- ✗ (czerwony) - Test nie przeszedł, wymaga naprawy

## Checklist przed wdrożeniem

- [ ] Wszystkie testy Supabase przechodzą
- [ ] Resend API działa
- [ ] Edge Function wdrożona
- [ ] SPF zawiera Resend
- [ ] DKIM skonfigurowany
- [ ] DMARC ustawiony (opcjonalnie)
- [ ] CORS działa poprawnie
- [ ] Brak błędów 4xx/5xx