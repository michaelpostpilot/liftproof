"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ExperimentResult } from "@/types/database";

interface MetricsSummaryProps {
  result: ExperimentResult;
}

export function MetricsSummary({ result }: MetricsSummaryProps) {
  const isSignificant = result.p_value !== null && result.p_value < 0.05;
  const isPositive = result.lift_percent !== null && result.lift_percent > 0;

  return (
    <div className="space-y-4">
      {/* Plain-English verdict */}
      <div
        className={`rounded-xl px-6 py-5 shadow-sm space-y-2 ${
          isSignificant && isPositive
            ? "bg-[#E8F0E8] border border-[#7A9E7E]/30"
            : isSignificant
              ? "bg-[#FDEEEA] border border-[#E05D3A]/20"
              : "bg-[#F5E6CC] border border-[#D4943A]/20"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className={`text-xl font-serif font-bold ${
            isSignificant && isPositive
              ? "text-[#3D6B42]"
              : isSignificant
                ? "text-[#E05D3A]"
                : "text-[#96600A]"
          }`}>
            {isSignificant && isPositive
              ? "Your campaign drove measurable lift"
              : isSignificant
                ? "Your campaign had a negative impact"
                : "No statistically significant effect detected"}
          </p>
          {result.p_value !== null && (
            <Badge variant="outline">p = {result.p_value.toFixed(4)}</Badge>
          )}
        </div>
        <p className={`text-sm ${
          isSignificant ? (isPositive ? "text-[#3D6B42]" : "text-[#E05D3A]") : "text-[#96600A]"
        }`}>
          {isSignificant && isPositive && result.lift_percent !== null && result.lift_amount !== null
            ? `Your treatment geos saw an estimated ${(result.lift_percent * 100).toFixed(1)}% lift (${result.lift_amount >= 0 ? "+" : ""}${Math.round(result.lift_amount).toLocaleString()} incremental units) compared to what would have happened without the campaign. This result is statistically significant (p = ${result.p_value?.toFixed(3)}), meaning it is very unlikely to be due to random chance.`
            : isSignificant && result.lift_percent !== null
              ? `The treatment geos showed a ${(result.lift_percent * 100).toFixed(1)}% change. This result is statistically significant, meaning the effect is real and not due to chance.`
              : `The observed difference between treatment and control geos was not large enough to rule out random chance. This doesn\u2019t necessarily mean the campaign had no effect \u2014 it may mean the effect was too small to detect with this test design, or the test didn\u2019t run long enough.`}
        </p>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard
          label="Lift %"
          value={
            result.lift_percent !== null
              ? `${isPositive ? "+" : ""}${(result.lift_percent * 100).toFixed(1)}%`
              : "N/A"
          }
          color={isPositive ? "text-[#3D6B42]" : "text-[#E05D3A]"}
        />
        <MetricCard
          label="Lift Amount"
          value={
            result.lift_amount !== null
              ? `${isPositive ? "+" : ""}$${Math.abs(result.lift_amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : "N/A"
          }
          color={isPositive ? "text-[#3D6B42]" : "text-[#E05D3A]"}
        />
        <MetricCard
          label="95% Confidence Interval"
          value={
            result.ci_lower !== null && result.ci_upper !== null
              ? `[${(result.ci_lower * 100).toFixed(1)}%, ${(result.ci_upper * 100).toFixed(1)}%]`
              : "N/A"
          }
        />
        {result.iroas !== null && (
          <MetricCard
            label="iROAS"
            value={`${result.iroas.toFixed(1)}x`}
            color="text-[#1A3A5C]"
          />
        )}
        {result.cpia !== null && (
          <MetricCard
            label="CPIA"
            value={`$${result.cpia.toFixed(2)}`}
          />
        )}
        {result.pre_period_fit_rmse !== null && (
          <MetricCard
            label="Pre-Period Fit (RMSE)"
            value={result.pre_period_fit_rmse.toFixed(2)}
            subtitle={
              result.pre_period_fit_rmse < 0.05
                ? "Excellent fit"
                : result.pre_period_fit_rmse < 0.1
                ? "Good fit"
                : "Fair fit"
            }
          />
        )}
      </div>

      {/* Model weights */}
      {result.model_weights && (
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-4">Model Ensemble Weights</p>
            <div className="space-y-2">
              {Object.entries(result.model_weights)
                .sort(([, a], [, b]) => b - a)
                .map(([model, weight]) => (
                  <div key={model} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-32 capitalize">
                      {model.replace(/_/g, " ")}
                    </span>
                    <div className="flex-1 bg-[#EDE9E0] rounded-full h-2.5">
                      <div
                        className="bg-[#0B1D2E] h-2.5 rounded-full transition-all"
                        style={{ width: `${weight * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium font-mono w-12 text-right">
                      {(weight * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
  subtitle,
}: {
  label: string;
  value: string;
  color?: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="py-5 px-5">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
        <p className={`text-3xl font-bold font-mono tracking-tight mt-1 ${color || ""}`}>{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
