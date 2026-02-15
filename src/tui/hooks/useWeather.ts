/**
 * Hook for weather data management.
 *
 * @module tui/hooks/useWeather
 */

import { useState, useCallback } from 'react';
import { getForecast, getMultiDayForecast } from '../../services/weather-service.js';
import type { WeatherForecast, DailyForecast, Result } from '../../types/index.js';

export interface UseWeatherResult {
  forecast: WeatherForecast | null;
  isLoading: boolean;
  error: string | null;
  fetchForecast: (lat: number, lon: number, date: string) => Promise<void>;
  fetchMultiDayForecast: (lat: number, lon: number) => Promise<void>;
  getTodayForecast: () => DailyForecast | null;
}

/**
 * Hook for fetching and managing weather data in the TUI.
 */
export function useWeather(): UseWeatherResult {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = useCallback(async (lat: number, lon: number, date: string) => {
    setIsLoading(true);
    setError(null);

    const result = await getForecast(lat, lon, date);

    if (!result.success) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    setForecast(result.data);
    setIsLoading(false);
  }, []);

  const fetchMultiDayForecast = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setError(null);

    const result = await getMultiDayForecast(lat, lon);

    if (!result.success) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    setForecast(result.data);
    setIsLoading(false);
  }, []);

  const getTodayForecast = useCallback((): DailyForecast | null => {
    if (!forecast) return null;

    const today = new Date().toISOString().split('T')[0];
    return forecast.forecasts.find((f) => f.date === today) ?? forecast.forecasts[0] ?? null;
  }, [forecast]);

  return {
    forecast,
    isLoading,
    error,
    fetchForecast,
    fetchMultiDayForecast,
    getTodayForecast,
  };
}
