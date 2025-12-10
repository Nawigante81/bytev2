import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook do cache'owania zapytań Supabase
 * @param {Function} queryFn - Funkcja zwracająca Promise z danymi
 * @param {number} cacheDuration - Czas cache w ms (domyślnie 30s)
 * @returns {Object} { data, loading, error, refetch }
 */
export const useSupabaseCache = (queryFn, cacheDuration = 30000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef({ data: null, timestamp: 0 });
  const abortControllerRef = useRef(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Sprawdź cache
    const now = Date.now();
    if (!forceRefresh && cacheRef.current.data && (now - cacheRef.current.timestamp) < cacheDuration) {
      setData(cacheRef.current.data);
      setLoading(false);
      return cacheRef.current.data;
    }

    // Anuluj poprzednie żądanie jeśli istnieje
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      
      // Sprawdź czy nie zostało anulowane
      if (!abortControllerRef.current.signal.aborted) {
        setData(result);
        cacheRef.current = { data: result, timestamp: now };
        setLoading(false);
        return result;
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        setError(err);
        setLoading(false);
      }
    }
  }, [queryFn, cacheDuration]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  // Czyszczenie przy unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { data, loading, error, refetch, fetchData };
};

export default useSupabaseCache;