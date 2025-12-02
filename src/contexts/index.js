/**
 * Centralny eksport kontekstów aplikacji
 * 
 * Używaj tych eksportów zamiast bezpośrednich importów z plików kontekstów.
 * To zapewnia spójność i ułatwia przełączanie między środowiskami.
 */

// Auth Context - używaj tego w całej aplikacji
export { AuthProvider, useAuth } from './SupabaseAuthContext';

// Re-eksport dla kompatybilności wstecznej (DEPRECATED - użyj useAuth)
// Te eksporty zostaną usunięte w przyszłej wersji
export { TestAuthProvider } from './TestAuthContext';