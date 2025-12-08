# Raport naprawy błędu daty w systemie rezerwacji

## Problem
Funkcja `create-booking` zwracała błąd 500 z komunikatem:
```
"invalid input syntax for type date: \"czwartek, 11 grudnia 2025\""
```

**Przyczyna**: Baza danych PostgreSQL oczekuje daty w formacie ISO (YYYY-MM-DD), ale aplikacja wysyłała datę w polskim formacie `"czwartek, 11 grudnia 2025"`.

## Rozwiązanie

### 1. Dodano funkcję parsowania daty
W pliku `supabase/functions/create-booking/index.ts` dodano funkcję `parsePolishDate()`:

```typescript
function parsePolishDate(dateStr: string): string {
  // Obsługuje format: "czwartek, 11 grudnia 2025" 
  // Konwertuje na: "2025-12-11"
  
  const monthMap: { [key: string]: string } = {
    'stycznia': '01', 'styczeń': '01',
    'lutego': '02', 'luty': '02', 
    // ... pozostałe miesiące
  };
  
  // Parsowanie i konwersja...
}
```

### 2. Zaktualizowano logikę zapisywania rezerwacji
```typescript
// Przed naprawą:
booking_date: requestData.date, // BŁĄD: polski format

// Po naprawie:
const parsedDate = parsePolishDate(requestData.date);
booking_date: parsedDate, // ✅ ISO format
```

### 3. Wdrożono poprawkę
```bash
npx supabase functions deploy create-booking
```

## Testowanie

### Utworzono test automatyczny
Plik: `test-booking-date-fix.js`

**Wynik testu:**
```
📡 Status odpowiedzi: 200
✅ Sukces! Rezerwacja utworzona: {
  success: true,
  bookingId: 'TEST-UKXDX5',
  message: 'Booking created successfully'
}
```

## Obsługiwane formaty dat
- ✅ `"czwartek, 11 grudnia 2025"` → `"2025-12-11"`
- ✅ `"11 grudnia 2025"` → `"2025-12-11"`
- ✅ `"2025-12-11"` (już ISO) → `"2025-12-11"` (bez zmian)
- ✅ Wszystkie polskie nazwy miesięcy (pełne i skrócone)

## Bezpieczeństwo
- Funkcja `parsePolishDate()` ma obsługę błędów
- Jeśli parsowanie się nie powiedzie, zwraca oryginalną datę
- Dodano logi do debugowania

## Status
🟢 **NAPRAWIONE** - System rezerwacji działa poprawnie z polskimi datami

---
*Data naprawy: 2025-12-08*  
*Testowano na środowisku produkcyjnym*