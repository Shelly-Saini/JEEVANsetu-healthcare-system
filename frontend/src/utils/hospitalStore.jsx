import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { bedService, doctorService, inventoryService } from '../services/api.js';
import listenerManager from './listenerManager.js';

const HospitalContext = createContext(null);

// Fallback empty state — used when API is unavailable
const EMPTY = { beds: [], doctors: [], items: [] };

export function HospitalProvider({ children }) {
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('jeevan_user')); } catch { return null; }
  })();
  const hospitalId = storedUser?.hospitalId || 'h1';
  const [sharedBeds,    setSharedBeds]    = useState([]);
  const [sharedDoctors, setSharedDoctors] = useState([]);
  const [sharedItems,   setSharedItems]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [stale,         setStale]         = useState(false);

  // ── Initial fetch ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const [bedsRes, doctorsRes, itemsRes] = await Promise.all([
        bedService.getAll(hospitalId),
        doctorService.getAll({ hospitalId }),
        inventoryService.getAll(hospitalId),
      ]);
      setSharedBeds(bedsRes.data?.data    ?? bedsRes.data    ?? []);
      setSharedDoctors(doctorsRes.data?.data ?? doctorsRes.data ?? []);
      setSharedItems(itemsRes.data?.data   ?? itemsRes.data   ?? []);
      setStale(bedsRes.data?.stale === true);
    } catch (err) {
      setError(err.message || 'Failed to load hospital data');
      // Keep existing state if any — don't wipe on refetch failure
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── OPD-triggered helpers (kept for event-bus compatibility) ───────────────
  const admitPatient = useCallback(() => fetchAll(), [fetchAll]);
  const assignToDoctor = useCallback(() => fetchAll(), [fetchAll]);
  const consumeInventory = useCallback(() => fetchAll(), [fetchAll]);

  // ── Listener cleanup on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => listenerManager.releaseAll();
  }, []);

  return (
    <HospitalContext.Provider value={{
      sharedBeds, setSharedBeds,
      sharedDoctors, setSharedDoctors,
      sharedItems, setSharedItems,
      loading, error, stale,
      refetch: fetchAll,
      admitPatient, assignToDoctor, consumeInventory,
      hospitalId,
    }}>
      {children}
    </HospitalContext.Provider>
  );
}

export const useHospital = () => useContext(HospitalContext);
