// Forecast is intentionally a transparent statistical heuristic, not a
// black-box model — every number here is explainable in one sentence, which
// matters more for a portfolio project than a marginally-more-accurate
// opaque model would.
//
// Method: ordinary least-squares linear regression of a metric against time,
// over the most recent snapshots. The slope tells us the metric's rate of
// change per hour; projecting that slope forward gives an ETA to a threshold
// (e.g. "beds will hit 0 available in ~X hours at the current rate").
//
// Two things keep the ETA operationally meaningful rather than a technically-
// correct-but-useless number:
//  1. The SAME slope threshold is used to both classify the trend direction
//     and decide whether to compute an ETA at all — a trend too flat to call
//     "declining" can't produce a "shortage in ~8000h" figure either.
//  2. Any ETA beyond FORECAST_HORIZON_HOURS is reported as "no shortage
//     expected within the forecast horizon" instead of a giant, low-confidence
//     number — a linear fit on a few hours of data has no business predicting
//     two weeks out with false precision.

const BED_SLOPE_THRESHOLD = 0.05;     // beds/hour — below this magnitude, the trend is "stable"
const STRESS_SLOPE_THRESHOLD = 0.5;   // stress points/hour — same idea
const FORECAST_HORIZON_HOURS = 14 * 24; // 14 days — beyond this, an ETA isn't operationally actionable

/** Simple linear regression: returns { slope, intercept } for y = slope*x + intercept */
const linearRegression = (points) => {
  const n = points.length;
  if (n < 2) return null;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
};

/** Rounds an hours figure to a precision that matches its own uncertainty:
 *  sub-day figures get one decimal place, multi-day figures round to whole hours. */
const roundHours = (h) => (h < 24 ? Math.round(h * 10) / 10 : Math.round(h));

/**
 * buildForecast — takes an array of MetricSnapshot docs (chronological) and
 * returns a short, explainable projection for bed availability and stress
 * score. Requires at least 3 snapshots to produce a trend; otherwise returns
 * a "not enough data yet" result rather than guessing.
 */
const buildForecast = (snapshots) => {
  if (snapshots.length < 3) {
    return {
      available: false,
      reason: 'Not enough history yet — forecasting needs at least 3 recorded snapshots for this hospital.',
    };
  }

  const t0 = new Date(snapshots[0].capturedAt).getTime();
  const bedPoints = snapshots.map((s) => ({
    x: (new Date(s.capturedAt).getTime() - t0) / 3_600_000, // hours since first snapshot
    y: s.availableBeds,
  }));
  const stressPoints = snapshots.map((s) => ({
    x: (new Date(s.capturedAt).getTime() - t0) / 3_600_000,
    y: s.stressScore,
  }));

  const bedTrend = linearRegression(bedPoints);
  const stressTrend = linearRegression(stressPoints);
  const latest = snapshots[snapshots.length - 1];
  const lastX = bedPoints[bedPoints.length - 1].x;

  const bedDirection = bedTrend.slope < -BED_SLOPE_THRESHOLD ? 'declining' : bedTrend.slope > BED_SLOPE_THRESHOLD ? 'improving' : 'stable';
  const stressDirection = stressTrend.slope > STRESS_SLOPE_THRESHOLD ? 'rising' : stressTrend.slope < -STRESS_SLOPE_THRESHOLD ? 'falling' : 'stable';

  // Only project an ETA when the trend itself was strong enough to be called
  // "declining"/"rising" (not "stable"), AND the projected ETA falls inside
  // the forecast horizon.
  let hoursToBedShortage = null;
  if (bedDirection === 'declining') {
    const eta = Math.max(0, (0 - (bedTrend.slope * lastX + bedTrend.intercept)) / bedTrend.slope);
    if (eta <= FORECAST_HORIZON_HOURS) hoursToBedShortage = roundHours(eta);
  }

  let hoursToHighStress = null;
  if (stressDirection === 'rising' && latest.stressScore < 75) {
    const eta = (75 - (stressTrend.slope * lastX + stressTrend.intercept)) / stressTrend.slope;
    if (eta >= 0 && eta <= FORECAST_HORIZON_HOURS) hoursToHighStress = roundHours(eta);
  }

  return {
    available: true,
    horizonHours: FORECAST_HORIZON_HOURS,
    bedTrend: {
      slopePerHour: Math.round(bedTrend.slope * 100) / 100,
      direction: bedDirection,
      hoursToShortage: hoursToBedShortage,
    },
    stressTrend: {
      slopePerHour: Math.round(stressTrend.slope * 100) / 100,
      direction: stressDirection,
      hoursToHigh: hoursToHighStress,
    },
    sampleSize: snapshots.length,
    windowStart: snapshots[0].capturedAt,
    windowEnd: latest.capturedAt,
  };
};

module.exports = { buildForecast, linearRegression };
