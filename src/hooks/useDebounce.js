import { useState, useEffect } from 'react';

/**
 * Custom hook do debounce wartości
 * @param {any} value - Wartość do debounce
 * @param {number} delay - Opóźnienie w ms (domyślnie 500ms)
 * @returns {any} Debounced wartość
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;