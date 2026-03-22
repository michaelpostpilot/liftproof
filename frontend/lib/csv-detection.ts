// Auto-detection logic for CSV column types

const US_STATES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
]);

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,          // YYYY-MM-DD
  /^\d{2}\/\d{2}\/\d{4}$/,        // MM/DD/YYYY
  /^\d{2}-\d{2}-\d{4}$/,          // MM-DD-YYYY
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,  // M/D/YY or M/D/YYYY
];

export type GeoGranularity = "state" | "dma" | "zip3" | "zip5" | "unknown";

export interface ColumnDetection {
  name: string;
  detectedType: "geo" | "date" | "kpi" | "spend" | "unknown";
  geoGranularity?: GeoGranularity;
  confidence: number; // 0-1
  sampleValues: string[];
}

export function detectColumnTypes(
  headers: string[],
  rows: string[][]
): ColumnDetection[] {
  return headers.map((header, colIdx) => {
    const values = rows.map((row) => row[colIdx]).filter(Boolean);
    const sampleValues = values.slice(0, 5);

    // Check for geo column
    const geoResult = detectGeo(header, values);
    if (geoResult.confidence > 0.5) {
      return {
        name: header,
        detectedType: "geo" as const,
        geoGranularity: geoResult.granularity,
        confidence: geoResult.confidence,
        sampleValues,
      };
    }

    // Check for date column
    const dateConfidence = detectDate(header, values);
    if (dateConfidence > 0.5) {
      return {
        name: header,
        detectedType: "date" as const,
        confidence: dateConfidence,
        sampleValues,
      };
    }

    // Check for spend column
    const spendConfidence = detectSpend(header);
    if (spendConfidence > 0.5) {
      return {
        name: header,
        detectedType: "spend" as const,
        confidence: spendConfidence,
        sampleValues,
      };
    }

    // Check for KPI (numeric) column
    const numericRatio = values.filter((v) => !isNaN(Number(v.replace(/[,$]/g, "")))).length / Math.max(values.length, 1);
    if (numericRatio > 0.8) {
      return {
        name: header,
        detectedType: "kpi" as const,
        confidence: numericRatio,
        sampleValues,
      };
    }

    return {
      name: header,
      detectedType: "unknown" as const,
      confidence: 0,
      sampleValues,
    };
  });
}

function detectGeo(
  header: string,
  values: string[]
): { confidence: number; granularity: GeoGranularity } {
  const headerLower = header.toLowerCase();

  // Check header name
  const geoHeaders = ["geo", "state", "dma", "zip", "market", "region", "geography", "location"];
  const headerMatch = geoHeaders.some((h) => headerLower.includes(h));

  // Check if values are US state codes
  const stateMatches = values.filter((v) => US_STATES.has(v.toUpperCase().trim())).length;
  if (stateMatches / Math.max(values.length, 1) > 0.7) {
    return { confidence: 0.95, granularity: "state" };
  }

  // Check if values are DMA codes (3-digit numbers 200-900)
  const dmaMatches = values.filter((v) => {
    const n = parseInt(v);
    return !isNaN(n) && n >= 200 && n <= 900 && v.length === 3;
  }).length;
  if (dmaMatches / Math.max(values.length, 1) > 0.7) {
    return { confidence: 0.85, granularity: "dma" };
  }

  // Check if values are ZIP3 (3-digit codes 0-999)
  const zip3Matches = values.filter((v) => /^\d{3}$/.test(v.trim())).length;
  if (zip3Matches / Math.max(values.length, 1) > 0.7 && headerMatch) {
    return { confidence: 0.7, granularity: "zip3" };
  }

  // Check if values are ZIP5
  const zip5Matches = values.filter((v) => /^\d{5}$/.test(v.trim())).length;
  if (zip5Matches / Math.max(values.length, 1) > 0.7) {
    return { confidence: 0.8, granularity: "zip5" };
  }

  if (headerMatch) {
    return { confidence: 0.6, granularity: "unknown" };
  }

  return { confidence: 0, granularity: "unknown" };
}

function detectDate(header: string, values: string[]): number {
  const headerLower = header.toLowerCase();
  const dateHeaders = ["date", "day", "week", "month", "period", "time"];
  const headerMatch = dateHeaders.some((h) => headerLower.includes(h));

  const dateMatches = values.filter((v) =>
    DATE_PATTERNS.some((pattern) => pattern.test(v.trim()))
  ).length;

  const ratio = dateMatches / Math.max(values.length, 1);

  if (ratio > 0.8) return 0.95;
  if (ratio > 0.5 && headerMatch) return 0.8;
  if (headerMatch) return 0.6;
  return ratio * 0.5;
}

function detectSpend(header: string): number {
  const headerLower = header.toLowerCase();
  const spendKeywords = ["spend", "cost", "investment", "budget", "ad_spend", "adspend", "media_cost"];
  if (spendKeywords.some((k) => headerLower.includes(k))) return 0.9;
  return 0;
}

export function getUniqueGeos(rows: string[][], geoColIndex: number): string[] {
  const geos = new Set<string>();
  rows.forEach((row) => {
    const value = row[geoColIndex]?.trim();
    if (value) geos.add(value);
  });
  return Array.from(geos).sort();
}

export function getDateRange(rows: string[][], dateColIndex: number): { min: string; max: string } | null {
  const dates = rows
    .map((row) => row[dateColIndex]?.trim())
    .filter(Boolean)
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) return null;
  return {
    min: dates[0].toISOString().split("T")[0],
    max: dates[dates.length - 1].toISOString().split("T")[0],
  };
}
