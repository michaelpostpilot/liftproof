/**
 * Live design quality assessment for experiment creation.
 *
 * All computations run on the client using parsed CSV rows already in memory.
 * Total compute time: <100ms for typical datasets (<100k rows).
 */

export type Rating = "green" | "amber" | "red";

export interface DesignMetric {
  label: string;
  value: string;
  rating: Rating;
  suggestion: string | null;
}

export interface PowerCalcParams {
  nTreatment: number;
  nControl: number;
  weeklyAvg: number;
  cv: number;
  durationWeeks: number;
  autocorrelation: number;
}

export interface PrePeriodChartPoint {
  date: string;
  treatment: number;
  control: number;
}

export interface DesignQualityResult {
  overall: Rating;
  overallLabel: string;
  metrics: DesignMetric[];
  powerCalcParams: PowerCalcParams | null;
  chartData: PrePeriodChartPoint[];
}

interface AssessInput {
  rows: Record<string, string>[];
  geoCol: string;
  dateCol: string;
  kpiCol: string;
  treatmentGeos: string[];
  controlGeos: string[];
  prePeriodStart: string;
  prePeriodEnd: string;
  treatmentStart: string;
  treatmentEnd: string;
}

/**
 * Main entry point: assess experiment design quality.
 */
export function assessDesignQuality(input: AssessInput): DesignQualityResult {
  const metrics: DesignMetric[] = [];

  // 1. Pre-period length
  const preDays = countDaysBetween(input.prePeriodStart, input.prePeriodEnd);
  const preRating: Rating = preDays >= 56 ? "green" : preDays >= 28 ? "amber" : "red";
  metrics.push({
    label: "Pre-period length",
    value: `${preDays} days`,
    rating: preRating,
    suggestion:
      preRating === "green"
        ? null
        : `Your pre-period is ${preDays} days. A longer baseline (56+ days) helps the model learn normal patterns more accurately.`,
  });

  // 2. Treatment period length
  const treatDays = countDaysBetween(input.treatmentStart, input.treatmentEnd);
  metrics.push({
    label: "Treatment period",
    value: `${treatDays} days`,
    rating: "green",
    suggestion: null,
  });

  // 3. Control geo count
  const controlCount = input.controlGeos.length;
  const controlRating: Rating = controlCount >= 5 ? "green" : controlCount >= 3 ? "amber" : "red";
  metrics.push({
    label: "Control geos",
    value: `${controlCount}`,
    rating: controlRating,
    suggestion:
      controlRating === "green"
        ? null
        : controlCount < 3
          ? `Only ${controlCount} control geos \u2014 you need at least 3, ideally 5+. Move some treatment geos to control, or use the "Recommend Split" button for an optimized assignment.`
          : `${controlCount} control geos is OK but 5+ is better. If possible, reduce the number of treatment geos to give the model more donors.`,
  });

  // 4. Pre-period correlation
  const correlation = computePrePeriodCorrelation(input);
  const corrRating: Rating =
    correlation === null ? "amber" : correlation >= 0.8 ? "green" : correlation >= 0.5 ? "amber" : "red";
  metrics.push({
    label: "Pre-period correlation",
    value: correlation !== null ? correlation.toFixed(2) : "N/A",
    rating: corrRating,
    suggestion:
      corrRating === "green" || correlation === null
        ? null
        : correlation < 0.5
          ? `Pre-period correlation is low (${correlation.toFixed(2)}). Treatment and control geos behave very differently. Try the "Recommend Split" button to find a better assignment, or move some treatment geos to control.`
          : `Pre-period correlation is moderate (${correlation.toFixed(2)}). A score above 0.80 is ideal. Try the "Recommend Split" button to see if a different assignment improves the fit.`,
  });

  // 5. Estimated MDE
  const mde = computeMDE(input);
  const mdeRating: Rating =
    mde === null ? "amber" : mde <= 5 ? "green" : mde <= 15 ? "amber" : "red";
  metrics.push({
    label: "Min. detectable effect",
    value: mde !== null ? `${mde.toFixed(1)}%` : "N/A",
    rating: mdeRating,
    suggestion:
      mdeRating === "green" || mde === null
        ? null
        : mde > 15
          ? `Your MDE is ${mde.toFixed(1)}% \u2014 only large effects will be detectable. To lower it: add more control geos (currently ${input.controlGeos.length}), extend the pre-period, or run the treatment longer.`
          : `Your MDE is ${mde.toFixed(1)}%. To detect smaller effects, add more control geos or extend the time periods.`,
  });

  // 6. Power calculator equivalent params
  const powerCalcParams = computePowerCalcParams(input);

  // Overall verdict
  const ratings = metrics.map((m) => m.rating);
  const overall: Rating = ratings.includes("red")
    ? "red"
    : ratings.includes("amber")
      ? "amber"
      : "green";

  const overallLabel =
    overall === "green"
      ? "Strong design \u2014 ready to run."
      : overall === "amber"
        ? "Moderate design \u2014 consider the suggestions below."
        : "Weak design \u2014 address the issues below before running.";

  // Chart data: treatment vs control group means across pre-period
  const chartData = computeChartData(input);

  return { overall, overallLabel, metrics, powerCalcParams, chartData };
}

// --- Computation helpers ---

function countDaysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * Compute Pearson correlation between treatment group mean and control group mean
 * across pre-period dates.
 */
function computePrePeriodCorrelation(input: AssessInput): number | null {
  try {
    const { treatMeans, controlMeans } = getGroupMeansByDate(input, input.prePeriodStart, input.prePeriodEnd);

    if (treatMeans.length < 3) return null;

    return pearsonCorrelation(treatMeans, controlMeans);
  } catch {
    return null;
  }
}

/**
 * Estimate minimum detectable effect using the same formula as the power calculator:
 * weekly CV with weekly time units.
 *
 * MDE = (z_alpha + z_beta) * weeklyCV * sqrt(1/n_treat + 1/n_control) / sqrt(T_weeks) * 100
 *
 * Daily geo data is highly autocorrelated, so using daily granularity with sqrt(T_days)
 * would overstate the effective sample size. Weekly aggregation is the correct unit.
 */
function computeMDE(input: AssessInput): number | null {
  try {
    const allGeos = [...input.treatmentGeos, ...input.controlGeos];
    const geoWeekly = aggregateGeoWeekly(
      input.rows, input.geoCol, input.dateCol, input.kpiCol,
      allGeos, input.prePeriodStart, input.prePeriodEnd
    );

    // Compute per-geo weekly CV, then average
    const cvs: number[] = [];
    for (const geo of allGeos) {
      const weeks = geoWeekly[geo];
      if (!weeks) continue;
      const values = Object.values(weeks);
      if (values.length < 3) continue;
      const m = mean(values);
      if (m === 0) continue;
      cvs.push(stdDev(values) / m);
    }

    if (cvs.length === 0) return null;

    const weeklyCV = mean(cvs);
    const nTreat = input.treatmentGeos.length;
    const nControl = input.controlGeos.length;
    const treatDays = countDaysBetween(input.treatmentStart, input.treatmentEnd);
    const tWeeks = Math.max(1, treatDays / 7);

    if (nTreat === 0 || nControl === 0) return null;

    // z = 1.96 (95% CI) + 0.84 (80% power) = 2.8
    const z = 2.8;
    // Compute autocorrelation from actual data instead of using a fixed default
    const rho = computeAutocorrelation(geoWeekly, allGeos);
    // Adjust for autocorrelation: T_eff = T × (1-ρ)/(1+ρ)
    const effectiveWeeks = Math.max(0.5, tWeeks * (1 - rho) / (1 + rho));
    const mdePercent = z * weeklyCV * Math.sqrt(1 / nTreat + 1 / nControl) / Math.sqrt(effectiveWeeks) * 100;

    return Math.abs(mdePercent);
  } catch {
    return null;
  }
}

/**
 * Aggregate KPI values by date for treatment and control groups.
 */
function getGroupMeansByDate(
  input: AssessInput,
  startDate: string,
  endDate: string
): { treatMeans: number[]; controlMeans: number[] } {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const treatSet = new Set(input.treatmentGeos);
  const controlSet = new Set(input.controlGeos);

  // Group by date
  const treatByDate: Record<string, number[]> = {};
  const controlByDate: Record<string, number[]> = {};

  for (const row of input.rows) {
    const dateStr = row[input.dateCol];
    const geoVal = row[input.geoCol];
    if (!dateStr || !geoVal) continue;

    const d = new Date(dateStr);
    if (isNaN(d.getTime()) || d < start || d > end) continue;

    const geo = row[input.geoCol];
    const val = parseFloat(row[input.kpiCol]);
    if (isNaN(val)) continue;

    const key = dateStr;

    if (treatSet.has(geo)) {
      if (!treatByDate[key]) treatByDate[key] = [];
      treatByDate[key].push(val);
    } else if (controlSet.has(geo)) {
      if (!controlByDate[key]) controlByDate[key] = [];
      controlByDate[key].push(val);
    }
  }

  // Get sorted dates that exist in both groups
  const allDates = Object.keys(treatByDate)
    .filter((d) => controlByDate[d])
    .sort();

  const treatMeans = allDates.map((d) => mean(treatByDate[d]));
  const controlMeans = allDates.map((d) => mean(controlByDate[d]));

  return { treatMeans, controlMeans };
}

function computeChartData(input: AssessInput): PrePeriodChartPoint[] {
  try {
    const start = new Date(input.prePeriodStart);
    const end = new Date(input.prePeriodEnd);
    const treatSet = new Set(input.treatmentGeos);
    const controlSet = new Set(input.controlGeos);

    const treatByDate: Record<string, number[]> = {};
    const controlByDate: Record<string, number[]> = {};

    for (const row of input.rows) {
      const dateStr = row[input.dateCol];
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (isNaN(d.getTime()) || d < start || d > end) continue;

      const geo = row[input.geoCol];
      const val = parseFloat(row[input.kpiCol]);
      if (isNaN(val)) continue;

      if (treatSet.has(geo)) {
        if (!treatByDate[dateStr]) treatByDate[dateStr] = [];
        treatByDate[dateStr].push(val);
      } else if (controlSet.has(geo)) {
        if (!controlByDate[dateStr]) controlByDate[dateStr] = [];
        controlByDate[dateStr].push(val);
      }
    }

    const allDates = Object.keys(treatByDate)
      .filter((d) => controlByDate[d])
      .sort();

    return allDates.map((d) => ({
      date: d,
      treatment: Math.round(mean(treatByDate[d])),
      control: Math.round(mean(controlByDate[d])),
    }));
  } catch {
    return [];
  }
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Aggregate daily KPI values into weekly sums per geo, excluding partial weeks.
 * Uses 7-day windows anchored to the start date so boundaries align with the data range.
 * Returns { geoWeekly, weekDayCounts } where partial weeks (< 7 days) can be filtered out.
 */
function aggregateGeoWeekly(
  rows: Record<string, string>[],
  geoCol: string,
  dateCol: string,
  kpiCol: string,
  geos: string[],
  startDate: string,
  endDate: string
): Record<string, Record<number, number>> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const geoSet = new Set(geos);

  // Track sums and day counts per geo per week
  const geoWeekly: Record<string, Record<number, number>> = {};
  const weekDayCounts: Record<number, Set<string>> = {};

  for (const row of rows) {
    const dateStr = row[dateCol];
    if (!dateStr) continue;
    const d = new Date(dateStr);
    if (isNaN(d.getTime()) || d < start || d > end) continue;

    const geo = row[geoCol];
    if (!geoSet.has(geo)) continue;

    const val = parseFloat(row[kpiCol]);
    if (isNaN(val)) continue;

    // Week number relative to start date (0-indexed)
    const dayOffset = Math.floor((d.getTime() - start.getTime()) / 86400000);
    const weekNum = Math.floor(dayOffset / 7);

    if (!geoWeekly[geo]) geoWeekly[geo] = {};
    if (!geoWeekly[geo][weekNum]) geoWeekly[geo][weekNum] = 0;
    geoWeekly[geo][weekNum] += val;

    if (!weekDayCounts[weekNum]) weekDayCounts[weekNum] = new Set();
    weekDayCounts[weekNum].add(dateStr);
  }

  // Remove partial weeks (fewer than 7 days of data)
  const fullWeeks = new Set(
    Object.entries(weekDayCounts)
      .filter(([, dates]) => dates.size >= 7)
      .map(([w]) => Number(w))
  );

  const filtered: Record<string, Record<number, number>> = {};
  for (const geo of geos) {
    if (!geoWeekly[geo]) continue;
    filtered[geo] = {};
    for (const [w, val] of Object.entries(geoWeekly[geo])) {
      if (fullWeeks.has(Number(w))) {
        filtered[geo][Number(w)] = val;
      }
    }
  }

  return filtered;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Compute power calculator equivalent params from actual data.
 * Calculates within-geo weekly CV and average weekly conversions per geo.
 */
function computePowerCalcParams(input: AssessInput): PowerCalcParams | null {
  try {
    const allGeos = [...input.treatmentGeos, ...input.controlGeos];
    const geoWeekly = aggregateGeoWeekly(
      input.rows, input.geoCol, input.dateCol, input.kpiCol,
      allGeos, input.prePeriodStart, input.prePeriodEnd
    );

    // Compute per-geo CV, then average
    const cvs: number[] = [];
    const geoWeeklyMeans: number[] = [];

    for (const geo of allGeos) {
      const weeks = geoWeekly[geo];
      if (!weeks) continue;
      const values = Object.values(weeks);
      if (values.length < 3) continue;

      const m = mean(values);
      if (m === 0) continue;

      const sd = stdDev(values);
      cvs.push(sd / m);
      geoWeeklyMeans.push(m);
    }

    if (cvs.length === 0 || geoWeeklyMeans.length === 0) return null;

    const avgCV = mean(cvs);
    const avgWeekly = Math.round(mean(geoWeeklyMeans));
    const treatDays = countDaysBetween(input.treatmentStart, input.treatmentEnd);
    const durationWeeks = Math.max(1, Math.round(treatDays / 7));
    const rho = computeAutocorrelation(geoWeekly, allGeos);

    return {
      nTreatment: input.treatmentGeos.length,
      nControl: input.controlGeos.length,
      weeklyAvg: avgWeekly,
      cv: Math.round(avgCV * 100) / 100,
      durationWeeks,
      autocorrelation: Math.round(rho * 100) / 100,
    };
  } catch {
    return null;
  }
}

/**
 * Compute average lag-1 autocorrelation across geos from weekly data.
 * For each geo, correlates its weekly values with the same values shifted by 1 week.
 * Returns the mean autocorrelation, clamped to [0, 0.95].
 */
function computeAutocorrelation(
  geoWeekly: Record<string, Record<number, number>>,
  geos: string[]
): number {
  const autocorrs: number[] = [];

  for (const geo of geos) {
    const weeks = geoWeekly[geo];
    if (!weeks) continue;

    // Sort week numbers and get values in order
    const weekNums = Object.keys(weeks).map(Number).sort((a, b) => a - b);
    if (weekNums.length < 4) continue; // need enough data points

    const values = weekNums.map((w) => weeks[w]);

    // Lag-1 autocorrelation: corr(x[0..n-2], x[1..n-1])
    const x = values.slice(0, -1);
    const y = values.slice(1);
    const r = pearsonCorrelation(x, y);

    if (!isNaN(r) && isFinite(r)) {
      autocorrs.push(r);
    }
  }

  if (autocorrs.length === 0) return 0.5; // fallback default

  // Clamp to [0, 0.95] — negative autocorrelation is rare and usually noise
  return clamped;
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;

  const mx = mean(x);
  const my = mean(y);

  let num = 0;
  let dx2 = 0;
  let dy2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }

  const denom = Math.sqrt(dx2 * dy2);
  if (denom === 0) return 0;

  return num / denom;
}
