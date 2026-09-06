/* eslint-disable react-refresh/only-export-components -- intentional context+provider+hook pattern */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { bedService, doctorService, inventoryService } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';
import { getSocket } from '../lib/socket.js';

const HospitalContext = createContext(null);

/**
 * HospitalProvider — the single fetch of a hospital's beds/doctors/inventory,
 * shared by every page (Beds, Doctors, Inventory, Admissions, Dashboard) so
 * they all read the same real API data instead of each maintaining its own
 * local mock array. Also subscribes to Socket.IO events so any mutation made
 * anywhere in the app (or by another connected client) updates every screen
 * live, without polling.
 */
export function HospitalProvider({ children }) {
  const { user } = useAuth();
  const hospitalId = user?.hospitalId || null;

  const [sharedBeds,    setSharedBeds]    = useState([]);
  const [sharedDoctors, setSharedDoctors] = useState([]);
  const [sharedItems,   setSharedItems]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!hospitalId) { setLoading(false); return; }
    try {
      setError(null);
      const [bedsRes, doctorsRes, itemsRes] = await Promise.all([
        bedService.getAll(hospitalId),
        doctorService.getAll({ hospitalId }),
        inventoryService.getAll(hospitalId),
      ]);
      setSharedBeds(bedsRes.data?.data ?? []);
      setSharedDoctors(doctorsRes.data?.data ?? []);
      setSharedItems(itemsRes.data?.data ?? []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load hospital data');
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => { setLoading(true); fetchAll(); }, [fetchAll]);

  // ── Realtime: join this hospital's room, patch shared state on events ──────
  useEffect(() => {
    if (!hospitalId || !user) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;

    const upsert = (setter) => (doc) =>
      setter((prev) => {
        const idx = prev.findIndex((x) => x.id === doc.id);
        if (idx === -1) return [...prev, doc];
        const next = [...prev];
        next[idx] = doc;
        return next;
      });
    const remove = (setter) => ({ id }) => setter((prev) => prev.filter((x) => x.id !== id));

    const onConnect = () => { setRealtimeConnected(true); socket.emit('join:hospital', hospitalId); };
    const onDisconnect = () => setRealtimeConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('bed:update', upsert(setSharedBeds));
    socket.on('bed:delete', remove(setSharedBeds));
    socket.on('doctor:update', upsert(setSharedDoctors));
    socket.on('doctor:delete', remove(setSharedDoctors));
    socket.on('inventory:update', upsert(setSharedItems));
    socket.on('inventory:delete', remove(setSharedItems));

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('bed:update');
      socket.off('bed:delete');
      socket.off('doctor:update');
      socket.off('doctor:delete');
      socket.off('inventory:update');
      socket.off('inventory:delete');
    };
  }, [hospitalId, user]);

  const admitPatient = useCallback(() => fetchAll(), [fetchAll]);
  const assignToDoctor = useCallback(() => fetchAll(), [fetchAll]);
  const consumeInventory = useCallback(() => fetchAll(), [fetchAll]);

  return (
    <HospitalContext.Provider value={{
      sharedBeds, setSharedBeds,
      sharedDoctors, setSharedDoctors,
      sharedItems, setSharedItems,
      loading, error, realtimeConnected,
      refetch: fetchAll,
      admitPatient, assignToDoctor, consumeInventory,
      hospitalId,
    }}>
      {children}
    </HospitalContext.Provider>
  );
}

export const useHospital = () => useContext(HospitalContext);
