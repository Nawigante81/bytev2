# Instrukcja Migracji - Tabela ticket_comments

## Cel
Dostosowanie projektu do nowej struktury tabeli `ticket_comments` zgodnie ze specyfikacją.

## Struktura docelowa tabeli
```sql
CREATE TABLE public.ticket_comments (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id     uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    author_id     uuid NOT NULL REFERENCES public.profiles(id),
    body          text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);
```

## Przygotowane migracje

### 1. Opcja 1: Aktualizacja istniejącej tabeli
**Plik:** `supabase/migrations/20251208_update_ticket_comments_structure.sql`
- Aktualizuje istniejącą tabelę `ticket_comments`
- Zmienia strukturę kolumn zgodnie ze specyfikacją
- Usuwa stare kolumny i dodaje nowe
- Aktualizuje indeksy i RLS policies

### 2. Opcja 2: Utworzenie nowej tabeli (REKOMENDOWANE)
**Plik:** `supabase/migrations/20251208_create_ticket_comments_new.sql`
- Usuwa starą tabelę i tworzy nową od zera
- Zawiera wszystkie potrzebne indeksy
- Zawiera RLS policies
- Zawiera funkcje pomocnicze `add_ticket_comment` i `get_ticket_comments`

## RLS Policies

### Polityki dostępu:
- **SELECT**: Administratorzy, autorzy komentarzy, właściciele zgłoszeń
- **INSERT**: Zalogowani użytkownicy
- **UPDATE**: Administratorzy i autorzy komentarzy
- **DELETE**: Administratorzy i autorzy komentarzy

## Funkcje pomocnicze

### `add_ticket_comment(ticket_id, author_id, body)`
Dodaje nowy komentarz do zgłoszenia:
```sql
SELECT add_ticket_comment(
    'uuid-zgłoszenia',
    'uuid-autora',
    'Treść komentarza'
);
```

### `get_ticket_comments(ticket_id)`
Pobiera wszystkie komentarze dla danego zgłoszenia:
```sql
SELECT * FROM get_ticket_comments('uuid-zgłoszenia');
```

## Jak uruchomić migrację

### Opcja 1: Supabase Studio
1. Przejdź do https://app.supabase.com/project/wllxicmacmfzmqdnovhp/sql
2. Otwórz zakładkę SQL Editor
3. Skopiuj zawartość pliku `20251208_create_ticket_comments_new.sql`
4. Wykonaj zapytanie

### Opcja 2: Supabase CLI
```bash
cd supabase
npx supabase db push
```

### Opcja 3: Bezpośrednie wykonanie SQL
1. Otwórz Supabase Dashboard
2. Przejdź do SQL Editor
3. Wykonaj zawartość pliku migracji

## Sprawdzenie poprawności

Po wykonaniu migracji, sprawdź strukturę tabeli:
```sql
-- Sprawdź strukturę tabeli
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ticket_comments' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Sprawdź RLS policies
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'ticket_comments'
ORDER BY policyname;
```

## Wynik
Po wykonaniu migracji tabela `ticket_comments` będzie miała strukturę:
- `id` (uuid, PRIMARY KEY, DEFAULT gen_random_uuid())
- `ticket_id` (uuid, NOT NULL, REFERENCES requests.id)
- `author_id` (uuid, NOT NULL, REFERENCES profiles.id) 
- `body` (text, NOT NULL)
- `created_at` (timestamptz, NOT NULL, DEFAULT now())

Tabela będzie zabezpieczona RLS policies i zawierać odpowiednie indeksy dla wydajności.