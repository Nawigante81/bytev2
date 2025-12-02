/**
 * Centralny eksport hooków aplikacji
 * 
 * Używaj tych eksportów zamiast bezpośrednich importów z plików hooków.
 * To zapewnia spójność i ułatwia przełączanie między środowiskami.
 */

// Cart Hook - używaj tego w całej aplikacji
export { CartProvider, useCart } from './useCart';

// Re-eksport dla kompatybilności wstecznej (DEPRECATED - użyj useCart)
// Te eksporty zostaną usunięte w przyszłej wersji
export { TestCartProvider } from './useTestCart';