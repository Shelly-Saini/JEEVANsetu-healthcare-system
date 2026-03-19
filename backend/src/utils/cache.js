// backend/src/utils/cache.js
// Lightweight TTL cache — no external dependencies.
// Stores serialized values with an expiry timestamp.
// Used to avoid re-reading rarely-changing Firestore data on every request.
//
// Free-tier impact: each cache hit saves N Firestore reads.
// Example: hospitals cached 60s, 10 req/min = 9 reads saved per minute per city.

const store = new Map(); // key -> { value, softExpiresAt, expiresAt }

/**
 * Get a cached value.
 * Returns null if hard-expired (>TTL).
 * Returns { value, stale: true } if soft-expired (>softTTL) — caller should background-refresh.
 * Returns { value, stale: false } if fully fresh.
 * @param {string} key
 */
const get = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now > entry.expiresAt) {
    store.delete(key);   // hard expired — lazy eviction
    return null;
  }
  return { value: entry.value, stale: now > entry.softExpiresAt };
};

/**
 * Store a value with a hard TTL and an optional soft TTL.
 * @param {string} key
 * @param {*}      value      — must be JSON-serializable
 * @param {number} ttlMs      — hard TTL in ms (default 60s)
 * @param {number} softTtlMs  — soft TTL in ms (default half of ttlMs)
 */
const set = (key, value, ttlMs = 60_000, softTtlMs = ttlMs / 2) => {
  const now = Date.now();
  store.set(key, { value, softExpiresAt: now + softTtlMs, expiresAt: now + ttlMs });
};

/**
 * Invalidate a specific key or all keys matching a prefix.
 * Call this after any write that changes the cached data.
 * @param {string} keyOrPrefix
 */
const invalidate = (keyOrPrefix) => {
  for (const key of store.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      store.delete(key);
    }
  }
};

/** Current cache size — useful for health-check endpoints. */
const size = () => store.size;

module.exports = { get, set, invalidate, size };
