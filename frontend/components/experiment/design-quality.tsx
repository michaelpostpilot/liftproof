"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  assessDesignQuality,
  type Rating,
  type DesignQualityResult,
} from "@/lib/design-quality";

interface DesignQualityProps {
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

const DOT_COLORS: Record<Rating, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

const BADGE_STYLES: Record<Rating, { variant: "default" | "secondary" | "destructive"; label: string }> = {
  green: { variant: "default", label: "Strong" },
  amber: { variant: "secondary", label: "Moderate" },
  red: { variant: "destructive", label: "Weak" },
};

export function DesignQuality(props: DesignQualityProps) {
  const result: DesignQualityResult = useMemo(
    () =>
      assessDesignQuality({
        rows: props.rows,
        geoCol: props.geoCol,
        dateCol: props.dateCol,
        kpiCol: props.kpiCol,
        treatmentGeos: props.treatmentGeos,
        controlGeos: props.controlGeos,
        prePeriodStart: props.prePeriodStart,
        prePeriodEnd: props.prePeriodEnd,
        treatmentStart: props.treatmentStart,
        treatmentEnd: props.treatmentEnd,
      }),
    [
      props.rows,
      props.geoCol,
      props.dateCol,
      props.kpiCol,
      props.treatmentGeos,
      props.controlGeos,
      props.prePeriodStart,
      props.prePeriodEnd,
      props.treatmentStart,
      props.treatmentEnd,
    ]
  );

  const badgeStyle = BADGE_STYLES[result.overall];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Design Quality</CardTitle>
          <Badge variant={badgeStyle.variant}>{badgeStyle.label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{result.overallLabel}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {result.metrics.map((metric) => (
            <div key={metric.label} className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block size-2.5 rounded-full shrink-0 ${DOT_COLORS[metric.rating]}`}
                />
                <span className="text-sm font-medium">{metric.label}</span>
                <span className="text-sm text-muted-foreground ml-auto font-mono">
                  {metric.value}
                </span>
              </div>
              {metric.suggestion && (
                <p className="text-xs text-muted-foreground pl-[18px]">
                  {metric.suggestion}
                </p>
              )}
            </div>
          ))}
        </div>

        {result.chartData.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Pre-period: Treatment vs Control
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={result.chartData.map((p) => ({
                ...p,
                date: formatChartDate(p.date),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  interval={Math.max(0, Math.floor(result.chartData.length / 8) - 1)}
                />
                <YAxis tick={{ fontSize: 10 }} width={50} />
                <Tooltip
                  formatter={(value) => [Number(value).toLocaleString(), ""]}
                  labelStyle={{ fontSize: 11 }}
                  contentStyle={{ fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="treatment"
                  name="Treatment"
                  stroke="#00152a"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="control"
                  name="Control"
                  stroke="#44617d"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {result.powerCalcParams && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  Estimated from data: <span className="font-mono">{result.powerCalcParams.weeklyAvg.toLocaleString()}</span> avg weekly conversions/geo, <span className="font-mono">{result.powerCalcParams.cv.toFixed(2)}</span> weekly CV
                </p>
              </div>
              <Link
                href={`/power-calculator?from=design-quality&nTreat=${result.powerCalcParams.nTreatment}&nControl=${result.powerCalcParams.nControl}&weeklyAvg=${result.powerCalcParams.weeklyAvg}&cv=${result.powerCalcParams.cv}&weeks=${result.powerCalcParams.durationWeeks}`}
                className="text-xs font-semibold text-[#00152a] hover:underline whitespace-nowrap ml-3"
              >
                Cross-check in Power Calculator &rarr;
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
