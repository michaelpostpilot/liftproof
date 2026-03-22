"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlaceboHistogramProps {
  nullDistribution: number[];
  observedEffect: number;
}

export function PlaceboHistogram({
  nullDistribution,
  observedEffect,
}: PlaceboHistogramProps) {
  // Create histogram bins
  const bins = createHistogramBins(nullDistribution, 30);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-serif">Placebo Distribution (Permutation Test)</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Distribution of placebo effects from Fisher randomization</p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bins} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => [Number(value), "Count"]}
                labelFormatter={(label) => `Effect: ${label}`}
              />

              <Bar dataKey="count" fill="#c8d5e2" radius={[2, 2, 0, 0]} />

              {/* Observed effect line */}
              <ReferenceLine
                x={findClosestBinLabel(bins, observedEffect)}
                stroke="#ef4444"
                strokeWidth={2}
                label={{
                  value: `Observed: ${observedEffect.toFixed(0)}`,
                  position: "top",
                  fill: "#ef4444",
                  fontSize: 11,
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 rounded-lg bg-stone-50 border px-4 py-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">What am I looking at?</p>
          <p>
            Each grey bar shows the &ldquo;lift&rdquo; LiftProof measured when
            it pretended random geos were the treatment group (a placebo test).
            The <span className="text-red-500 font-semibold">red line</span> is
            your actual observed effect. If it sits far outside the grey bars,
            your result is unlikely to be random chance &mdash; i.e., it is
            statistically significant.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function createHistogramBins(
  values: number[],
  numBins: number
): { label: string; count: number; binCenter: number }[] {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const binWidth = range / numBins;

  const bins = Array.from({ length: numBins }, (_, i) => ({
    label: ((min + binWidth * i + binWidth / 2) / 1000).toFixed(1) + "k",
    count: 0,
    binCenter: min + binWidth * i + binWidth / 2,
  }));

  values.forEach((v) => {
    const idx = Math.min(Math.floor((v - min) / binWidth), numBins - 1);
    bins[idx].count++;
  });

  return bins;
}

function findClosestBinLabel(
  bins: { label: string; binCenter: number }[],
  value: number
): string {
  let closest = bins[0];
  let minDist = Math.abs(bins[0].binCenter - value);

  for (const bin of bins) {
    const dist = Math.abs(bin.binCenter - value);
    if (dist < minDist) {
      minDist = dist;
      closest = bin;
    }
  }

  return closest.label;
}
