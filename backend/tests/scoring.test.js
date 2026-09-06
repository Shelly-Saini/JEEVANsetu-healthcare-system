const { calcOpdScore, calcBedScore, calcDoctorScore, calcStressScore, computeHospitalScores } = require('../src/utils/scoring');

describe('scoring.calcOpdScore', () => {
  it('returns 0 for an empty queue', () => {
    expect(calcOpdScore([])).toBe(0);
  });

  it('only counts waiting/in-progress entries', () => {
    const queue = [
      { status: 'waiting' }, { status: 'in-progress' },
      { status: 'completed' }, { status: 'cancelled' },
    ];
    // 2 active out of MAX_OPD_CAPACITY=50 → 4%
    expect(calcOpdScore(queue)).toBeCloseTo(4, 5);
  });

  it('caps at 100 when active count exceeds capacity', () => {
    const queue = Array.from({ length: 80 }, () => ({ status: 'waiting' }));
    expect(calcOpdScore(queue)).toBe(100);
  });
});

describe('scoring.calcBedScore', () => {
  it('returns 0 when there are no beds', () => {
    expect(calcBedScore([])).toBe(0);
  });

  it('computes weighted occupancy across bed types', () => {
    const beds = [
      { total: 10, occupied: 5 },
      { total: 20, occupied: 10 },
    ];
    // 15 occupied / 30 total = 50%
    expect(calcBedScore(beds)).toBeCloseTo(50, 5);
  });
});

describe('scoring.calcDoctorScore', () => {
  it('returns 0 for no doctors', () => {
    expect(calcDoctorScore([])).toBe(0);
  });

  it('blends unavailability (70%) with average workload (30%)', () => {
    const doctors = [
      { status: 'available', workload: 40 },
      { status: 'busy', workload: 90 },
    ];
    // unavailabilityPct = 50, avgWorkload = 65 → 50*0.7 + 65*0.3 = 54.5
    expect(calcDoctorScore(doctors)).toBeCloseTo(54.5, 5);
  });
});

describe('scoring.calcStressScore', () => {
  it('weights OPD 40%, beds 40%, doctors 20%', () => {
    const { score } = calcStressScore(100, 0, 0);
    expect(score).toBe(40);
  });

  it('labels below 45 as Low, 45-74 as Medium, 75+ as High', () => {
    expect(calcStressScore(0, 0, 0).label).toBe('Low');
    expect(calcStressScore(50, 50, 50).label).toBe('Medium');
    expect(calcStressScore(100, 100, 100).label).toBe('High');
  });
});

describe('scoring.computeHospitalScores', () => {
  it('produces a full breakdown including doctorAvailability', () => {
    const queue = [{ status: 'waiting' }];
    const beds = [{ total: 10, occupied: 3 }];
    const doctors = [{ status: 'available', workload: 20 }, { status: 'busy', workload: 90 }];

    const result = computeHospitalScores(queue, beds, doctors);
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('label');
    expect(result.doctorAvailability).toBe(50); // 1 of 2 doctors available
  });
});
