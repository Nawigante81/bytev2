# Implementacja Edge Function - API Zarządzania Użytkownikami Admin

## 🎯 Przegląd

Ta implementacja tworzy bezpieczną edge function backend dla zarządzania użytkownikami admin, zgodnie z najlepszymi praktykami bezpieczeństwa - przenosząc operacje `auth.admin` z frontendu do backendu.

## 🔧 Co Zostało Zmienione

### Przed (Bezpośredni Dostęp z Frontendu)
```javascript
// ❌ Frontend wywoływał bezpośrednio API admin
const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
```

### Po (Edge Function Backend)
```javascript
// ✅ Frontend teraz wywołuje bezpieczne API backend
const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
});
```

## 📁 Pliki Utworzone/Zmodyfikowane

### 1. Edge Function Backend
**Plik:** `supabase/functions/admin-users/index.ts`

**Funkcje:**
- ✅ Używa `SERVICE_ROLE_KEY` bezpiecznie na backend
- ✅ Waliduje autoryzację admin przez tokeny JWT
- ✅ Udostępnia punkty końcowe REST API do zarządzania użytkownikami
- ✅ Zawiera odpowiednie obsługiwanie błędów i wsparcie CORS

**Punkty Końcowe API:**
- `GET /functions/v1/admin-users` - Lista użytkowników z paginacją i wyszukiwaniem
- `POST /functions/v1/admin-users` - Wykonanie akcji admin

**Obsługiwane Akcje:**
- `promote-admin` - Awans użytkownika do roli admin
- `demote-user` - Degradacja admina do zwykłego użytkownika
- `create-profile` - Utworzenie profilu użytkownika
- `delete-profile` - Usunięcie profilu użytkownika

### 2. Aktualizacje Frontendu
**Plik:** `src/pages/UserManagement.jsx`

**Zmiany:**
- 🔄 Zastąpiono bezpośrednie wywołania `supabase.auth.admin` bezpiecznymi wywołaniami API
- 🔄 Dodano odpowiednie nagłówki autoryzacji
- 🔄 Scentralizowano wywołania API przez funkcję pomocniczą `callAdminApi`
- 🔄 Zachowano całą istniejącą funkcjonalność UI

## 🛡️ Implementacja Bezpieczeństwa

### Bezpieczeństwo Backend
```typescript
// 1. Klucz service role używany tylko na backend
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// 2. Weryfikacja admin dla każdego żądania
async function verifyAdminContext(authHeader: string | null): Promise<AdminContext | null> {
  // Weryfikuj token JWT użytkownika
  // Sprawdź rolę admin w tabeli profiles
  // Zwróć kontekst admin lub null
}

// 3. Wszystkie operacje wymagają uprawnień admin
if (!adminContext) {
  return new Response('Brak uprawnień administratora', { status: 403 });
}
```

### Bezpieczeństwo Frontend
```javascript
// Zawsze dołączaj token sesji użytkownika
const { data: { session } } = await supabase.auth.getSession();
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
});
```

## 📊 Przykłady Użycia API

### Implementacja Frontend
```javascript
// Lista użytkowników
const response = await fetch('/functions/v1/admin-users', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
});

// Awans użytkownika na admina
await fetch('/functions/v1/admin-users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'promote-admin',
    userId: 'user-uuid',
    fullName: 'Administrator Name'
  })
});
```

### Edge Function Backend
```typescript
// Wszystkie operacje używają SERVICE_ROLE_KEY bezpiecznie
const { data, error } = await supabaseAdmin.auth.admin.listUsers({
  page: 1,
  perPage: 50,
});

// Sprawdź uprawnienia admin
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('id, role')
  .eq('id', user.id)
  .maybeSingle();

if (!profile || profile.role !== 'admin') {
  throw new Error('Brak uprawnień administratora');
}
```

## 🚀 Instrukcje Wdrożenia

### 1. Wdróż Edge Function
```bash
# Wdróż do Supabase
supabase functions deploy admin-users

# Ustaw zmienne środowiskowe (jeśli potrzeba)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Przetestuj Implementację
```bash
# Uruchom skrypt testowy
node test-admin-users-api.js
```

### 3. Zaktualizuj Zmienne Środowiskowe
Upewnij się, że te zmienne są ustawione:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

## 🔍 Testowanie

### Zakres Testów
- ✅ Odrzucenie nieautoryzowanego dostępu
- ✅ Obsługa nieprawidłowych akcji
- ✅ Walidacja uprawnień admin
- ✅ Integracja z frontendem

### Testowanie Ręczne
1. **Bez Tokena Admin:** Powinien zwrócić błąd 403
2. **Z Tokenem Admin:** Powinien zwrócić listę użytkowników i pozwolić na akcje zarządzania
3. **Integracja Frontend:** Strona UserManagement powinna działać normalnie

## 📈 Korzyści

### Bezpieczeństwo
- 🔒 Brak ekspozycji klucza service role na front
- 🔒 Weryfikacja JWT oparta na tokenach
- 🔒 Scentralizowana kontrola dostępu
- 🔒 Ślad audytowy przez logi edge function

### Wydajność
- ⚡ Zmniejszone zapytania do bazy danych (operacje wsadowe)
- ⚡ Lepsze obsługiwanie błędów i cache
- ⚡ Zoptymalizowana paginacja i wyszukiwanie

### Utrzymywalność
- 🧹 Jedno źródło prawdy dla operacji admin
- 🧹 Łatwe rozszerzanie o nowe funkcje admin
- 🧹 Lepsze rozdzielenie odpowiedzialności

## 🔧 Rozwiązywanie Problemów

### Częste Problemy
1. **"Brak uprawnień administratora"** - Użytkownik nie ma roli admin
2. **Błędy 401/403** - Nieprawidłowy lub brakujący token JWT
3. **Błędy CORS** - Brak odpowiednich nagłówków

### Kroki Debugowania
1. Sprawdź rolę użytkownika w tabeli `profiles`
2. Sprawdź czy token JWT jest prawidłowy
3. Sprawdź logi edge function: `supabase functions logs admin-users`
4. Upewnij się, że zmienne środowiskowe są ustawione

## 📚 Powiązane Pliki

- `supabase/functions/admin-users/index.ts` - Implementacja edge function
- `src/pages/UserManagement.jsx` - Zaktualizowany komponent frontendu
- `test-admin-users-api.js` - Skrypt testowy
- `supabase/functions/admin-console/index.ts` - Istniejąca funkcja admin (dla referencji)

---

**✅ Implementacja Zakończona:** Zarządzanie użytkownikami admin teraz przestrzega najlepszych praktyk bezpieczeństwa, przenosząc wrażliwe operacje na backend, zachowując jednocześnie to samo doświadczenie użytkownika.