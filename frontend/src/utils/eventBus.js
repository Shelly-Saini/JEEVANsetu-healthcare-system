// ─── Event Bus ────────────────────────────────────────────────────────────────
// Supported events:
//   PATIENT_ADDED      { patient, severity }
//   PATIENT_COMPLETED  { patientName }
//   BED_ASSIGNED       { bedId, patientName }
//   LOW_STOCK_ALERT    { itemId, itemName, category }

const listeners = {};

export const onEvent = (event, callback) => {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
  // returns unsubscribe fn
  return () => {
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  };
};

export const emitEvent = (event, data = {}) => {
  console.log('[EventBus]', event, data);
  (listeners[event] || []).forEach(cb => cb(data));
};

// Supported events:
//   PATIENT_ADDED      { patient, severity }
//   PATIENT_COMPLETED  { patientName }
//   BED_ASSIGNED       { bedId, patientName }
//   LOW_STOCK_ALERT    { itemName, category }
//   DOCTOR_OVERLOADED  { department, name }
//   DOCTOR_ASSIGNED    { doctor }
//   ITEM_RESTOCKED     { item }
