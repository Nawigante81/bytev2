# Rozwiązanie problemu z uprawnieniami JWT Secret

## Problem
```
Error: Failed to run sql query: ERROR: 42501: permission denied to set parameter "app.jwt_secret"
```

## Przyczyna
W pliku migracji `20251201_create_booking_and_repair_tables.sql` znajdowała się nieprawidłowa linia:

```sql
ALTER DATABASE postgres SET "app.jwt_secret" TO 'super-secret-jwt-token-with-at-least-32-characters-long';
```

## Dlaczego to był błąd
1. **Wewnętrzny parametr Supabase**: `app.jwt_secret` to wewnętrzny parametr Supabase, który nie powinien być zmieniany ręcznie
2. **Brak uprawnień**: Zwykły użytkownik bazy danych nie ma uprawnień do modyfikowania tego parametru
3. **Bezpieczeństwo**: JWT secret jest już odpowiednio skonfigurowany w panelu Supabase

## Rozwiązanie
Usunięto problematyczną linię z migracji. JWT secret jest automatycznie zarządzany przez Supabase i nie wymaga ręcznej konfiguracji.

## Co zostało zrobione
1. Usunięto linię `ALTER DATABASE postgres SET "app.jwt_secret"` z migracji
2. Poprawiono formatowanie komentarzy na początku pliku
3. Sprawdzono, że nie ma innych odniesień do tego parametru w projekcie

## Status
✅ **Problem rozwiązany** - migracja może być teraz uruchomiona bez błędów uprawnień

## Uwagi
- JWT secret w Supabase jest automatycznie generowany i zarządzany
- Nie ma potrzeby ręcznego ustawiania tego parametru
- Jeśli potrzebujesz zmienić JWT secret, zrób to w panelu Supabase pod Settings > API