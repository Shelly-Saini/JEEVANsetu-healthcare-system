const { buildForecast, linearRegression } = require('../src/utils/forecast');

describe('forecast.linearRegression', () => {
  it('returns null with fewer than 2 points', () => {
    expect(linearRegression([{ x: 0, y: 5 }])).toBeNull();
  });

  it('fits a perfect line exactly', () => {
    const points = [{ x: 0, y: 10 }, { x: 1, y: 8 }, { x: 2, y: 6 }];
    const { slope, intercept } = linearRegression(points);
    expect(slope).toBeCloseTo(-2, 5);
    expect(intercept).toBeCloseTo(10, 5);
  });
});

describe('forecast.buildForecast', () => {
  it('reports unavailable with fewer than 3 snapshots', () => {
    const result = buildForecast([
      { capturedAt: new Date(), availableBeds: 5, stressScore: 40 },
    ]);
    expect(result.available).toBe(false);
  });

  it('detects a declining bed trend and projects hours to shortage', () => {
    const base = Date.now();
    const snapshots = [0, 1, 2, 3, 4].map((h) => ({
      capturedAt: new Date(base + h * 3_600_000),
      availableBeds: 10 - h * 2, // loses 2 beds/hour
      stressScore: 40 + h * 2,
    }));

    const result = buildForecast(snapshots);
    expect(result.available).toBe(true);
    expect(result.bedTrend.direction).toBe('declining');
    expect(result.bedTrend.hoursToShortage).not.toBeNull();
    // Available beds hits 0 at h=5 (10 - 2*5 = 0); last snapshot is h=4, so ~1 hour out
    expect(result.bedTrend.hoursToShortage).toBeCloseTo(1, 0);
  });

  it('reports a stable trend when values barely move', () => {
    const base = Date.now();
    const snapshots = [0, 1, 2].map((h) => ({
      capturedAt: new Date(base + h * 3_600_000),
      availableBeds: 10,
      stressScore: 40,
    }));
    const result = buildForecast(snapshots);
    expect(result.bedTrend.direction).toBe('stable');
    expect(result.bedTrend.hoursToShortage).toBeNull();
  });

  it('never reports an ETA for a slope too small to be called "declining" (regression test for the ~8385h bug)', () => {
    const base = Date.now();
    // A barely-declining slope of ~0.011 beds/hour — below the 0.05 threshold,
    // so this must be "stable" with no ETA, not a multi-hundred-hour projection.
    const snapshots = [0, 1, 2, 3].map((h) => ({
      capturedAt: new Date(base + h * 3_600_000),
      availableBeds: 92 - h * 0.011,
      stressScore: 40,
    }));
    const result = buildForecast(snapshots);
    expect(result.bedTrend.direction).toBe('stable');
    expect(result.bedTrend.hoursToShortage).toBeNull();
  });

  it('suppresses an ETA that falls beyond the forecast horizon even for a genuine decline', () => {
    const base = Date.now();
    // Declining at 0.06 beds/hour (above the 0.05 threshold, so "declining"),
    // but from 500 available beds that's an ETA far beyond the 14-day horizon.
    const snapshots = [0, 1, 2, 3].map((h) => ({
      capturedAt: new Date(base + h * 3_600_000),
      availableBeds: 500 - h * 0.06,
      stressScore: 40,
    }));
    const result = buildForecast(snapshots);
    expect(result.bedTrend.direction).toBe('declining');
    expect(result.bedTrend.hoursToShortage).toBeNull();
  });
});
