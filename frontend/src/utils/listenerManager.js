// frontend/src/utils/listenerManager.js
// Singleton listener registry — ensures at most ONE active Firestore listener
// per (resource, hospitalId) pair per browser session.
//
// Problem it solves:
//   React StrictMode double-invokes effects. Route changes can remount components
//   before the previous unmount fires. Both cause duplicate onSnapshot listeners
//   that each count as a separate read stream — doubling or tripling read costs.
//
// Usage:
//   import listenerManager from './listenerManager';
//
//   // In useEffect:
//   const key = listenerManager.key('opdQueue', hospitalId);
//   if (!listenerManager.has(key)) {
//     const unsub = listenWaitingQueue(hospitalId, setQueue, console.error);
//     listenerManager.register(key, unsub);
//   }
//   return () => listenerManager.release(key);

const _listeners = new Map(); // key -> unsubscribe function

const listenerManager = {
  /**
   * Build a canonical key for a listener.
   * @param {'opdQueue'|'beds'} resource
   * @param {string} hospitalId
   */
  key: (resource, hospitalId) => `${resource}::${hospitalId}`,

  /** Returns true if a live listener already exists for this key. */
  has: (key) => _listeners.has(key),

  /**
   * Register a new listener. If one already exists for this key,
   * the existing one is unsubscribed first (safety net).
   * @param {string}   key
   * @param {Function} unsubscribe — the function returned by onSnapshot()
   */
  register: (key, unsubscribe) => {
    if (_listeners.has(key)) {
      _listeners.get(key)();   // unsubscribe stale listener before replacing
    }
    _listeners.set(key, unsubscribe);
  },

  /**
   * Unsubscribe and remove a listener.
   * Safe to call even if the key does not exist.
   * @param {string} key
   */
  release: (key) => {
    if (_listeners.has(key)) {
      _listeners.get(key)();
      _listeners.delete(key);
    }
  },

  /**
   * Unsubscribe ALL active listeners — call on logout or full app teardown.
   */
  releaseAll: () => {
    for (const unsub of _listeners.values()) unsub();
    _listeners.clear();
  },

  /** Current active listener count — useful for debugging. */
  count: () => _listeners.size,
};

export default listenerManager;
