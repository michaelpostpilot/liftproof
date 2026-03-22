"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TreatmentVsSyntheticProps {
  dates: string[];
  treatmentSeries: number[];
  syntheticSeries: number[];
  treatmentStartIndex: number;
  kpiLabel: string;
}

export function TreatmentVsSyntheticChart({
  dates,
  treatmentSeries,
  syntheticSeries,
  treatmentStartIndex,
  kpiLabel,
}: TreatmentVsSyntheticProps) {
  const data = dates.map((date, i) => ({
    date: formatDateLabel(date),
    treatment: treatmentSeries[i],
    synthetic: syntheticSeries[i],
  }));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-serif">Treatment vs Synthetic Control</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Daily KPI for treatment geos vs the synthetic counterfactual</p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => [
                  `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                ]}
              />
              <Legend />

              {/* Treatment period background */}
              {treatmentStartIndex < dates.length && (
                <ReferenceArea
                  x1={formatDateLabel(dates[treatmentStartIndex])}
                  x2={formatDateLabel(dates[dates.length - 1])}
                  fill="#7A9E7E"
                  fillOpacity={0.08}
                />
              )}

              {/* Treatment start line */}
              <ReferenceLine
                x={formatDateLabel(dates[treatmentStartIndex])}
                stroke="#0B1D2E"
                strokeDasharray="4 4"
                label={{ value: "Treatment Start", position: "top", fontSize: 10 }}
              />

              <Line
                type="monotone"
                dataKey="treatment"
                stroke="#7A9E7E"
                strokeWidth={2.5}
                dot={false}
                name={`Actual (${kpiLabel})`}
              />
              <Line
                type="monotone"
                dataKey="synthetic"
                stroke="#1A3A5C"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                name="Synthetic Control"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDateLabel(date: string): string {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
