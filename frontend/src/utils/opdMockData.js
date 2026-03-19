// Mock seed data for OPD queue — development/demo only
export const INITIAL_PATIENT_SEEDS = [
  { id: '1', token: 'A001', name: 'Patient 001', severity: 'Critical', offsetMins: 30, status: 'In Progress' },
  { id: '2', token: 'A002', name: 'Patient 002', severity: 'Critical', offsetMins: 25, status: 'Waiting'     },
  { id: '3', token: 'A003', name: 'Patient 003', severity: 'High',     offsetMins: 20, status: 'Waiting'     },
  { id: '4', token: 'A004', name: 'Patient 004', severity: 'Medium',   offsetMins: 15, status: 'Waiting'     },
  { id: '5', token: 'A005', name: 'Patient 005', severity: 'Low',      offsetMins: 10, status: 'Waiting'     },
];

export const SAMPLE_NAME_POOL = [
  'Patient A', 'Patient B', 'Patient C', 'Patient D', 'Patient E',
  'Patient F', 'Patient G', 'Patient H', 'Patient I', 'Patient J',
  'Patient K', 'Patient L', 'Patient M', 'Patient N', 'Patient O',
];
