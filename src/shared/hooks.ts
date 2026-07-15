import { useState, useEffect, useCallback } from "react";
import { Shipment, DashboardStats } from "./types.js";
import { ShipplixApiClient } from "./api.ts";

/**
 * A highly reusable hook for managing states in localStorage
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

/**
 * A custom hook for fetching and managing all shipments and dashboard statistics
 */
export function useShipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalShipments: 0,
    deliveredShipments: 0,
    inTransit: 0,
    pendingVerification: 0,
    todayBookings: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ShipplixApiClient.fetchAllShipments();
      setShipments(data);
      const calculatedStats = ShipplixApiClient.calculateStats(data);
      setStats(calculatedStats);
    } catch (err: any) {
      setError(err?.message || "Failed to load shipments database.");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    shipments,
    stats,
    loading,
    error,
    fetchShipments,
    setShipments,
    setStats
  };
}

/**
 * A custom hook for tracking a single shipment and managing its state
 */
export function useTrackShipment(initialTrackingNumber: string = "") {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedNumber, setSearchedNumber] = useState("");

  const track = useCallback(async (trackingNumber: string) => {
    const trimmed = trackingNumber.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setSearchedNumber(trimmed);
    try {
      const data = await ShipplixApiClient.trackShipment(trimmed);
      if (!data) {
        setError(`Shipment with tracking number "${trimmed}" could not be located. Check spelling and retry.`);
        setShipment(null);
      } else {
        setShipment(data);
      }
    } catch (err: any) {
      setError(err?.message || "Unable to connect to the tracking gateway.");
      setShipment(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialTrackingNumber) {
      track(initialTrackingNumber);
    }
  }, [initialTrackingNumber, track]);

  return {
    shipment,
    loading,
    error,
    searchedNumber,
    track,
    setShipment,
    setError
  };
}
