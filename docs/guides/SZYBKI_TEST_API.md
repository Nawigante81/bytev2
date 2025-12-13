# 🚀 Szybki Test API - 2 minuty

## Metoda 1: Przeglądarka (NAJSZYBSZA)

1. **Otwórz:** `test-contact-api.html` w przeglądarce
2. **Naciśnij F12** → zakładka **Network**
3. **Kliknij:** "🚀 Wyślij testowe zgłoszenie"
4. **Zobacz:**
   - Request URL - czy to `/functions/v1/notify-new-diagnosis`?
   - Status - 200/404/403/500?
   - Response - co zwraca?

## Metoda 2: Terminal

```bash
# Windows
test-contact-api.bat

# Linux/Mac
chmod +x test-contact-api.sh
./test-contact-api.sh
```

## Metoda 3: Produkcja

1. Otwórz: https://byteclinic.pl/kontakt
2. F12 → Network
3. Wypełnij formularz → Wyślij
4. Zobacz request w Network

---

## 🔍 Co sprawdzić w DevTools Network?

### ✅ Request URL
```
https://wllxicmacmfzmqdnovhp.supabase.co/functions/v1/notify-new-diagnosis
```

### ✅ Method
```
POST (nie OPTIONS)
```

### ✅ Status
- `200` = ✅ Działa
- `404` = ❌ Brak Edge Function
- `403` = ❌ Brak autoryzacji
- `500` = ❌ Błąd w funkcji

### ✅ Headers
```
Authorization: Bearer eyJhbGci...
Content-Type: application/json
apikey: eyJhbGci...
```

---

## 🔴 Najczęstsze problemy

### 404 - Endpoint nie istnieje
```bash
# Wdróż Edge Function
supabase functions deploy notify-new-diagnosis
```

### 403 - Brak autoryzacji
1. Sprawdź `.env` → `VITE_SUPABASE_ANON_KEY`
2. Supabase Dashboard → API → CORS → dodaj domenę

### 500 - Błąd serwera
1. Supabase Dashboard → Edge Functions → Logs
2. Zobacz błąd i napraw kod

---

## 📋 Checklist

- [ ] Request URL jest poprawny
- [ ] Method to POST
- [ ] Status to 200
- [ ] Headers zawierają Authorization i apikey
- [ ] Response zwraca JSON

---

**Pełna instrukcja:** `INSTRUKCJA_TESTOWANIA_API.md`
