"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CumulativeLiftProps {
  dates: string[];
  cumulativeLift: number[];
  ciLower?: number[] | null;
  ciUpper?: number[] | null;
  treatmentStartIndex: number;
}

export function CumulativeLiftChart({
  dates,
  cumulativeLift,
  ciLower,
  ciUpper,
  treatmentStartIndex,
}: CumulativeLiftProps) {
  // Only show treatment period data for cumulative lift
  const treatmentDates = dates.slice(treatmentStartIndex);
  const data = treatmentDates.map((date, i) => ({
    date: formatDateLabel(date),
    lift: cumulativeLift[i],
    ciLower: ciLower?.[i] ?? null,
    ciUpper: ciUpper?.[i] ?? null,
  }));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-serif">Cumulative Incremental Lift</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Running total of incremental units during the treatment period</p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => [
                  `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                ]}
              />
              <Legend />
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />

              {/* CI band */}
              {ciLower && ciUpper && (
                <Area
                  type="monotone"
                  dataKey="ciUpper"
                  stroke="none"
                  fill="#7A9E7E"
                  fillOpacity={0.12}
                  name="95% CI Upper"
                />
              )}
              {ciLower && ciUpper && (
                <Area
                  type="monotone"
                  dataKey="ciLower"
                  stroke="none"
                  fill="#F8F6F1"
                  fillOpacity={1}
                  name="95% CI Lower"
                />
              )}

              <Line
                type="monotone"
                dataKey="lift"
                stroke="#0B1D2E"
                strokeWidth={2.5}
                dot={false}
                name="Cumulative Lift"
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
