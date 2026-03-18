const { v4: uuidv4 } = require('crypto').webcrypto
  ? (() => { try { return require('crypto'); } catch { return null; } })()
  : require('crypto');

// Simple UUID generator without external deps
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const db = {
  users: [
    {
      id: 'u1',
      name: 'City Admin',
      email: 'cityadmin@jeevansetu.in',
      password: '$2a$10$Xk1Q2W3E4R5T6Y7U8I9O0Pabcdefghijklmnopqrstuvwxyz012345', // hashed "admin123"
      role: 'city_admin',
      cityId: 'city1',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'u2',
      name: 'Hospital Admin - Apollo',
      email: 'admin@apollo.in',
      password: '$2a$10$Xk1Q2W3E4R5T6Y7U8I9O0Pabcdefghijklmnopqrstuvwxyz012345',
      role: 'hospital_admin',
      hospitalId: 'h1',
      createdAt: '2024-01-02T00:00:00Z',
    },
    {
      id: 'u3',
      name: 'OPD Desk - Apollo',
      email: 'opd@apollo.in',
      password: '$2a$10$Xk1Q2W3E4R5T6Y7U8I9O0Pabcdefghijklmnopqrstuvwxyz012345',
      role: 'opd_desk',
      hospitalId: 'h1',
      createdAt: '2024-01-03T00:00:00Z',
    },
    {
      id: 'u4',
      name: 'Hospital Admin - AIIMS',
      email: 'admin@aiims.in',
      password: '$2a$10$Xk1Q2W3E4R5T6Y7U8I9O0Pabcdefghijklmnopqrstuvwxyz012345',
      role: 'hospital_admin',
      hospitalId: 'h2',
      createdAt: '2024-01-04T00:00:00Z',
    },
  ],

  hospitals: [
    {
      id: 'h1',
      name: 'Apollo Hospital',
      city: 'Delhi',
      cityId: 'city1',
      address: 'Sarita Vihar, Delhi Mathura Road, New Delhi - 110076',
      phone: '+91-11-71791090',
      lat: 28.5355,
      lng: 77.2510,
      totalBeds: 120,
      stressScore: 72,
      status: 'moderate',
      departments: ['Cardiology', 'Neurology', 'Orthopedics', 'General', 'Emergency'],
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'h2',
      name: 'AIIMS Delhi',
      city: 'Delhi',
      cityId: 'city1',
      address: 'Sri Aurobindo Marg, Ansari Nagar, New Delhi - 110029',
      phone: '+91-11-26588500',
      lat: 28.5672,
      lng: 77.2100,
      totalBeds: 200,
      stressScore: 88,
      status: 'critical',
      departments: ['Cardiology', 'Oncology', 'Neurology', 'Pediatrics', 'General', 'Emergency'],
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'h3',
      name: 'Fortis Hospital',
      city: 'Delhi',
      cityId: 'city1',
      address: 'Sector B, Pocket 1, Aruna Asaf Ali Marg, New Delhi - 110070',
      phone: '+91-11-42776222',
      lat: 28.5700,
      lng: 77.1800,
      totalBeds: 150,
      stressScore: 45,
      status: 'normal',
      departments: ['Cardiology', 'Orthopedics', 'General', 'Emergency', 'Gynecology'],
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'h4',
      name: 'Max Super Speciality',
      city: 'Delhi',
      cityId: 'city1',
      address: '1, Press Enclave Road, Saket, New Delhi - 110017',
      phone: '+91-11-26515050',
      lat: 28.5244,
      lng: 77.2066,
      totalBeds: 100,
      stressScore: 60,
      status: 'moderate',
      departments: ['Neurology', 'Oncology', 'General', 'Emergency', 'Pediatrics'],
      createdAt: '2024-01-01T00:00:00Z',
    },
  ],

  beds: [
    // Apollo (h1)
    { id: 'b1',  hospitalId: 'h1', type: 'ICU',       total: 20, available: 5,  occupied: 13, cleaning: 2,  updatedAt: new Date().toISOString() },
    { id: 'b2',  hospitalId: 'h1', type: 'General',   total: 80, available: 22, occupied: 52, cleaning: 6,  updatedAt: new Date().toISOString() },
    { id: 'b3',  hospitalId: 'h1', type: 'Emergency', total: 20, available: 4,  occupied: 14, cleaning: 2,  updatedAt: new Date().toISOString() },
    // AIIMS (h2)
    { id: 'b4',  hospitalId: 'h2', type: 'ICU',       total: 40, available: 3,  occupied: 35, cleaning: 2,  updatedAt: new Date().toISOString() },
    { id: 'b5',  hospitalId: 'h2', type: 'General',   total: 130,available: 10, occupied: 112,cleaning: 8,  updatedAt: new Date().toISOString() },
    { id: 'b6',  hospitalId: 'h2', type: 'Emergency', total: 30, available: 2,  occupied: 26, cleaning: 2,  updatedAt: new Date().toISOString() },
    // Fortis (h3)
    { id: 'b7',  hospitalId: 'h3', type: 'ICU',       total: 25, available: 14, occupied: 9,  cleaning: 2,  updatedAt: new Date().toISOString() },
    { id: 'b8',  hospitalId: 'h3', type: 'General',   total: 100,available: 58, occupied: 36, cleaning: 6,  updatedAt: new Date().toISOString() },
    { id: 'b9',  hospitalId: 'h3', type: 'Emergency', total: 25, available: 12, occupied: 11, cleaning: 2,  updatedAt: new Date().toISOString() },
    // Max (h4)
    { id: 'b10', hospitalId: 'h4', type: 'ICU',       total: 15, available: 6,  occupied: 8,  cleaning: 1,  updatedAt: new Date().toISOString() },
    { id: 'b11', hospitalId: 'h4', type: 'General',   total: 65, available: 28, occupied: 33, cleaning: 4,  updatedAt: new Date().toISOString() },
    { id: 'b12', hospitalId: 'h4', type: 'Emergency', total: 20, available: 8,  occupied: 10, cleaning: 2,  updatedAt: new Date().toISOString() },
  ],

  doctors: [
    // Apollo (h1)
    { id: 'd1', hospitalId: 'h1', name: 'Dr. Priya Sharma',   department: 'Cardiology',    status: 'available', patientsToday: 12, maxPatients: 20, shift: 'morning' },
    { id: 'd2', hospitalId: 'h1', name: 'Dr. Arjun Mehta',    department: 'Neurology',     status: 'busy',      patientsToday: 18, maxPatients: 20, shift: 'morning' },
    { id: 'd3', hospitalId: 'h1', name: 'Dr. Sunita Rao',     department: 'Orthopedics',   status: 'available', patientsToday: 8,  maxPatients: 20, shift: 'morning' },
    { id: 'd4', hospitalId: 'h1', name: 'Dr. Vikram Singh',   department: 'General',       status: 'available', patientsToday: 15, maxPatients: 25, shift: 'morning' },
    { id: 'd5', hospitalId: 'h1', name: 'Dr. Neha Gupta',     department: 'Emergency',     status: 'busy',      patientsToday: 22, maxPatients: 25, shift: 'morning' },
    // AIIMS (h2)
    { id: 'd6', hospitalId: 'h2', name: 'Dr. Rajesh Kumar',   department: 'Cardiology',    status: 'busy',      patientsToday: 20, maxPatients: 20, shift: 'morning' },
    { id: 'd7', hospitalId: 'h2', name: 'Dr. Anita Patel',    department: 'Oncology',      status: 'busy',      patientsToday: 19, maxPatients: 20, shift: 'morning' },
    { id: 'd8', hospitalId: 'h2', name: 'Dr. Suresh Nair',    department: 'Neurology',     status: 'unavailable',patientsToday: 0, maxPatients: 20, shift: 'off'     },
    { id: 'd9', hospitalId: 'h2', name: 'Dr. Kavita Joshi',   department: 'Pediatrics',    status: 'available', patientsToday: 14, maxPatients: 20, shift: 'morning' },
    // Fortis (h3)
    { id: 'd10',hospitalId: 'h3', name: 'Dr. Amit Verma',     department: 'Cardiology',    status: 'available', patientsToday: 6,  maxPatients: 20, shift: 'morning' },
    { id: 'd11',hospitalId: 'h3', name: 'Dr. Pooja Iyer',     department: 'Gynecology',    status: 'available', patientsToday: 9,  maxPatients: 20, shift: 'morning' },
    { id: 'd12',hospitalId: 'h3', name: 'Dr. Ravi Shankar',   department: 'Orthopedics',   status: 'available', patientsToday: 5,  maxPatients: 20, shift: 'morning' },
    // Max (h4)
    { id: 'd13',hospitalId: 'h4', name: 'Dr. Meera Pillai',   department: 'Neurology',     status: 'available', patientsToday: 11, maxPatients: 20, shift: 'morning' },
    { id: 'd14',hospitalId: 'h4', name: 'Dr. Sanjay Dubey',   department: 'Oncology',      status: 'busy',      patientsToday: 17, maxPatients: 20, shift: 'morning' },
  ],

  opdQueues: [
    { id: 'q1',  hospitalId: 'h1', token: 'A001', patientName: 'Ramesh Yadav',    age: 45, department: 'Cardiology',  severity: 'high',   status: 'waiting',    estimatedWait: 10, registeredAt: new Date(Date.now() - 30 * 60000).toISOString() },
    { id: 'q2',  hospitalId: 'h1', token: 'A002', patientName: 'Sunita Devi',     age: 32, department: 'General',     severity: 'low',    status: 'waiting',    estimatedWait: 35, registeredAt: new Date(Date.now() - 25 * 60000).toISOString() },
    { id: 'q3',  hospitalId: 'h1', token: 'A003', patientName: 'Mohan Lal',       age: 60, department: 'Neurology',   severity: 'medium', status: 'in-progress',estimatedWait: 0,  registeredAt: new Date(Date.now() - 20 * 60000).toISOString() },
    { id: 'q4',  hospitalId: 'h1', token: 'A004', patientName: 'Priti Sharma',    age: 28, department: 'Orthopedics', severity: 'low',    status: 'waiting',    estimatedWait: 50, registeredAt: new Date(Date.now() - 15 * 60000).toISOString() },
    { id: 'q5',  hospitalId: 'h1', token: 'A005', patientName: 'Anil Kumar',      age: 55, department: 'Cardiology',  severity: 'critical',status: 'waiting',   estimatedWait: 5,  registeredAt: new Date(Date.now() - 10 * 60000).toISOString() },
    { id: 'q6',  hospitalId: 'h2', token: 'B001', patientName: 'Geeta Singh',     age: 40, department: 'Oncology',    severity: 'high',   status: 'waiting',    estimatedWait: 15, registeredAt: new Date(Date.now() - 40 * 60000).toISOString() },
    { id: 'q7',  hospitalId: 'h2', token: 'B002', patientName: 'Deepak Mishra',   age: 35, department: 'General',     severity: 'low',    status: 'waiting',    estimatedWait: 60, registeredAt: new Date(Date.now() - 35 * 60000).toISOString() },
    { id: 'q8',  hospitalId: 'h3', token: 'C001', patientName: 'Lalita Verma',    age: 50, department: 'Cardiology',  severity: 'medium', status: 'waiting',    estimatedWait: 20, registeredAt: new Date(Date.now() - 20 * 60000).toISOString() },
    { id: 'q9',  hospitalId: 'h4', token: 'D001', patientName: 'Suresh Tiwari',   age: 62, department: 'Neurology',   severity: 'high',   status: 'in-progress',estimatedWait: 0,  registeredAt: new Date(Date.now() - 45 * 60000).toISOString() },
    { id: 'q10', hospitalId: 'h4', token: 'D002', patientName: 'Rekha Pandey',    age: 29, department: 'General',     severity: 'low',    status: 'waiting',    estimatedWait: 30, registeredAt: new Date(Date.now() - 10 * 60000).toISOString() },
  ],

  inventory: [
    // Apollo (h1)
    { id: 'i1',  hospitalId: 'h1', item: 'Oxygen Cylinders',  category: 'oxygen',    quantity: 45,  unit: 'cylinders', minThreshold: 20, status: 'ok',       updatedAt: new Date().toISOString() },
    { id: 'i2',  hospitalId: 'h1', item: 'PPE Kits',          category: 'ppe',       quantity: 12,  unit: 'kits',      minThreshold: 50, status: 'critical', updatedAt: new Date().toISOString() },
    { id: 'i3',  hospitalId: 'h1', item: 'Paracetamol 500mg', category: 'medicine',  quantity: 500, unit: 'strips',    minThreshold: 100,status: 'ok',       updatedAt: new Date().toISOString() },
    { id: 'i4',  hospitalId: 'h1', item: 'Surgical Gloves',   category: 'ppe',       quantity: 30,  unit: 'boxes',     minThreshold: 40, status: 'low',      updatedAt: new Date().toISOString() },
    { id: 'i5',  hospitalId: 'h1', item: 'IV Fluids',         category: 'medicine',  quantity: 80,  unit: 'bottles',   minThreshold: 50, status: 'ok',       updatedAt: new Date().toISOString() },
    // AIIMS (h2)
    { id: 'i6',  hospitalId: 'h2', item: 'Oxygen Cylinders',  category: 'oxygen',    quantity: 18,  unit: 'cylinders', minThreshold: 30, status: 'low',      updatedAt: new Date().toISOString() },
    { id: 'i7',  hospitalId: 'h2', item: 'PPE Kits',          category: 'ppe',       quantity: 8,   unit: 'kits',      minThreshold: 50, status: 'critical', updatedAt: new Date().toISOString() },
    { id: 'i8',  hospitalId: 'h2', item: 'Remdesivir',        category: 'medicine',  quantity: 25,  unit: 'vials',     minThreshold: 20, status: 'ok',       updatedAt: new Date().toISOString() },
    { id: 'i9',  hospitalId: 'h2', item: 'Ventilators',       category: 'equipment', quantity: 5,   unit: 'units',     minThreshold: 3,  status: 'ok',       updatedAt: new Date().toISOString() },
    // Fortis (h3)
    { id: 'i10', hospitalId: 'h3', item: 'Oxygen Cylinders',  category: 'oxygen',    quantity: 90,  unit: 'cylinders', minThreshold: 20, status: 'ok',       updatedAt: new Date().toISOString() },
    { id: 'i11', hospitalId: 'h3', item: 'PPE Kits',          category: 'ppe',       quantity: 120, unit: 'kits',      minThreshold: 50, status: 'ok',       updatedAt: new Date().toISOString() },
    { id: 'i12', hospitalId: 'h3', item: 'Surgical Masks',    category: 'ppe',       quantity: 200, unit: 'boxes',     minThreshold: 50, status: 'ok',       updatedAt: new Date().toISOString() },
    // Max (h4)
    { id: 'i13', hospitalId: 'h4', item: 'Oxygen Cylinders',  category: 'oxygen',    quantity: 22,  unit: 'cylinders', minThreshold: 20, status: 'ok',       updatedAt: new Date().toISOString() },
    { id: 'i14', hospitalId: 'h4', item: 'PPE Kits',          category: 'ppe',       quantity: 35,  unit: 'kits',      minThreshold: 50, status: 'low',      updatedAt: new Date().toISOString() },
    { id: 'i15', hospitalId: 'h4', item: 'Morphine',          category: 'medicine',  quantity: 10,  unit: 'vials',     minThreshold: 15, status: 'low',      updatedAt: new Date().toISOString() },
  ],

  admissions: [
    { id: 'a1', hospitalId: 'h1', patientName: 'Ramesh Yadav',  age: 45, department: 'Cardiology',  bedType: 'ICU',     decision: 'admit',  reason: 'Chest pain, high severity',          admittedAt: new Date(Date.now() - 2 * 3600000).toISOString(),  status: 'admitted'  },
    { id: 'a2', hospitalId: 'h1', patientName: 'Sunita Devi',   age: 32, department: 'General',     bedType: 'General', decision: 'delay',  reason: 'Low severity, beds near capacity',   admittedAt: new Date(Date.now() - 1 * 3600000).toISOString(),  status: 'pending'   },
    { id: 'a3', hospitalId: 'h2', patientName: 'Geeta Singh',   age: 40, department: 'Oncology',    bedType: 'General', decision: 'admit',  reason: 'Scheduled chemotherapy',             admittedAt: new Date(Date.now() - 3 * 3600000).toISOString(),  status: 'admitted'  },
    { id: 'a4', hospitalId: 'h2', patientName: 'Deepak Mishra', age: 35, department: 'General',     bedType: 'General', decision: 'redirect',reason: 'Hospital stress critical, redirect to Fortis', admittedAt: new Date().toISOString(), status: 'redirected' },
    { id: 'a5', hospitalId: 'h3', patientName: 'Lalita Verma',  age: 50, department: 'Cardiology',  bedType: 'ICU',     decision: 'admit',  reason: 'Stable, beds available',             admittedAt: new Date(Date.now() - 1 * 3600000).toISOString(),  status: 'admitted'  },
  ],
};

// ─── CRUD Operations ──────────────────────────────────────────────────────────

const getAll = (collectionName) => {
  if (!db[collectionName]) throw new Error(`Collection "${collectionName}" not found`);
  return [...db[collectionName]];
};

const getById = (collectionName, id) => {
  if (!db[collectionName]) throw new Error(`Collection "${collectionName}" not found`);
  return db[collectionName].find((doc) => doc.id === id) || null;
};

const add = (collectionName, data) => {
  if (!db[collectionName]) throw new Error(`Collection "${collectionName}" not found`);
  const newDoc = { id: uid(), ...data, createdAt: new Date().toISOString() };
  db[collectionName].push(newDoc);
  return newDoc;
};

const update = (collectionName, id, updatedData) => {
  if (!db[collectionName]) throw new Error(`Collection "${collectionName}" not found`);
  const index = db[collectionName].findIndex((doc) => doc.id === id);
  if (index === -1) return null;
  db[collectionName][index] = { ...db[collectionName][index], ...updatedData, updatedAt: new Date().toISOString() };
  return db[collectionName][index];
};

const remove = (collectionName, id) => {
  if (!db[collectionName]) throw new Error(`Collection "${collectionName}" not found`);
  const index = db[collectionName].findIndex((doc) => doc.id === id);
  if (index === -1) return null;
  const [removed] = db[collectionName].splice(index, 1);
  return removed;
};

module.exports = { getAll, getById, add, update, remove };
