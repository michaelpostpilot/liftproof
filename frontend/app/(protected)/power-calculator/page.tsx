"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Normal CDF approximation (Abramowitz & Stegun)
function normCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// Inverse normal CDF approximation (Rational approximation)
function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
    3.754408661907416e0,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q, r;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(
        (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
      )
    );
  }
}

interface PowerResult {
  power: number;
  mde: number;
  expectedIncrementalTotal: number;
  totalTreatmentConversions: number;
  totalControlConversions: number;
  effectSize: number;
}

function computePower(
  nTreatment: number,
  nControl: number,
  weeklyAvg: number,
  liftPct: number,
  durationWeeks: number,
  cv: number,
  alpha: number
): PowerResult {
  // Weekly std dev per geo (within-geo week-to-week noise)
  const sigmaWeekly = cv * weeklyAvg;

  // Standard error of the difference in means
  // After aggregating over weeks, the per-geo variance is sigma^2 / T
  // Then across geos: SE = sigma/sqrt(T) * sqrt(1/n_treat + 1/n_ctrl)
  const se =
    (sigmaWeekly / Math.sqrt(durationWeeks)) *
    Math.sqrt(1 / nTreatment + 1 / nControl);

  // Expected effect (absolute lift per geo per week)
  const effect = weeklyAvg * (liftPct / 100);

  // Z critical value for two-sided test
  const zAlpha = normInv(1 - alpha / 2);

  // Power = P(Z > z_alpha - effect/SE) = Phi(effect/SE - z_alpha)
  const power = normCDF(effect / se - zAlpha);

  // Minimum detectable effect at 80% power
  const zBeta = normInv(0.8); // ~0.842
  const mdeAbsolute = (zAlpha + zBeta) * se;
  const mde = (mdeAbsolute / weeklyAvg) * 100;

  // Expected incremental conversions
  const totalTreatmentConversions = weeklyAvg * durationWeeks * nTreatment;
  const totalControlConversions = weeklyAvg * durationWeeks * nControl;
  const expectedIncrementalTotal = totalTreatmentConversions * (liftPct / 100);

  return {
    power,
    mde,
    expectedIncrementalTotal,
    totalTreatmentConversions,
    totalControlConversions,
    effectSize: effect / se,
  };
}

function PowerGauge({ power }: { power: number }) {
  const pct = Math.round(power * 100);
  const color =
    pct >= 80
      ? "text-[#3D6B42]"
      : pct >= 60
        ? "text-[#96600A]"
        : "text-[#E05D3A]";
  const arcColor =
    pct >= 80
      ? "text-[#7A9E7E]"
      : pct >= 60
        ? "text-[#D4943A]"
        : "text-[#E05D3A]";
  const label =
    pct >= 80 ? "Strong" : pct >= 60 ? "Marginal" : "Underpowered";

  return (
    <div className="text-center space-y-3">
      <div className="relative inline-flex items-center justify-center">
        <svg className="w-36 h-36" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-[#EDE9E0]"
            strokeDasharray={`${Math.PI * 100}`}
            strokeDashoffset={`${Math.PI * 100 * 0.25}`}
            strokeLinecap="round"
            transform="rotate(135 60 60)"
          />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className={arcColor}
            strokeDasharray={`${Math.PI * 100}`}
            strokeDashoffset={`${Math.PI * 100 * (1 - pct / 100 * 0.75)}`}
            strokeLinecap="round"
            transform="rotate(135 60 60)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-extrabold font-mono ${color}`}>{pct}%</span>
        </div>
      </div>
      <div>
        <span
          className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
            pct >= 80
              ? "bg-[#E8F0E8] text-[#3D6B42]"
              : pct >= 60
                ? "bg-[#F5E6CC] text-[#96600A]"
                : "bg-[#FDEEEA] text-[#E05D3A]"
          }`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  tooltip,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  tooltip?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#EDE9E0] text-[#8A8880] text-[10px] font-bold cursor-help leading-none"
              >
                ?
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-64 text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            value={value}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange(v);
            }}
            className="w-20 h-8 text-right text-sm"
            min={min}
            max={max}
            step={step}
          />
          {suffix && (
            <span className="text-sm text-muted-foreground w-6">{suffix}</span>
          )}
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={(val) => onChange(Array.isArray(val) ? val[0] : val)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
}

export default function PowerCalculatorPage() {
  const searchParams = useSearchParams();

  const paramNum = (key: string, fallback: number) => {
    const v = searchParams.get(key);
    if (v === null) return fallback;
    const n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  };

  const [nTreatment, setNTreatment] = useState(paramNum("nTreat", 3));
  const [nControl, setNControl] = useState(paramNum("nControl", 7));
  const [weeklyAvg, setWeeklyAvg] = useState(paramNum("weeklyAvg", 500));
  const [liftPct, setLiftPct] = useState(paramNum("lift", 10));
  const [durationWeeks, setDurationWeeks] = useState(paramNum("weeks", 4));
  const [cv, setCv] = useState(paramNum("cv", 0.15));
  const [alpha, setAlpha] = useState(0.05);
  const fromDesignQuality = searchParams.get("from") === "design-quality";
  const [showAdvanced, setShowAdvanced] = useState(fromDesignQuality);

  const result = useMemo(
    () =>
      computePower(
        nTreatment,
        nControl,
        weeklyAvg,
        liftPct,
        durationWeeks,
        cv,
        alpha
      ),
    [nTreatment, nControl, weeklyAvg, liftPct, durationWeeks, cv, alpha]
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-serif italic text-4xl text-[#0B1D2E]">
          Power Calculator
        </h1>
        <p className="text-muted-foreground mt-1">
          Estimate whether your planned geo test will have enough statistical
          power to detect a meaningful lift.
        </p>
      </div>

      {fromDesignQuality && (
        <div className="bg-[#EDE9E0] text-[#5C5B56] text-sm p-4 rounded-lg">
          Parameters auto-filled from your experiment&apos;s actual data. The CV and weekly average are computed from pre-period within-geo weekly variation. Adjust &ldquo;Expected lift&rdquo; to see what effect sizes you can detect.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Inputs */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Test Parameters</CardTitle>
            <CardDescription>
              Adjust these to model your planned experiment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SliderField
              label="Treatment geos"
              value={nTreatment}
              onChange={setNTreatment}
              min={1}
              max={100}
              step={1}
            />
            <SliderField
              label="Control geos"
              value={nControl}
              onChange={setNControl}
              min={1}
              max={100}
              step={1}
            />
            <SliderField
              label="Test duration"
              value={durationWeeks}
              onChange={setDurationWeeks}
              min={1}
              max={12}
              step={1}
              suffix="wk"
            />
            <SliderField
              label="Avg. weekly conversions per geo"
              value={weeklyAvg}
              onChange={setWeeklyAvg}
              min={10}
              max={10000}
              step={10}
            />
            <SliderField
              label="Expected lift"
              value={liftPct}
              onChange={setLiftPct}
              min={0.5}
              max={50}
              step={0.5}
              suffix="%"
            />

            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-muted-foreground"
              >
                {showAdvanced ? "Hide" : "Show"} advanced settings
              </Button>

              {showAdvanced && (
                <div className="space-y-6 mt-4">
                  <SliderField
                    label="Weekly coefficient of variation"
                    value={cv}
                    onChange={setCv}
                    min={0.05}
                    max={0.5}
                    step={0.01}
                    tooltip="How much your weekly conversions fluctuate within a single geo. 0.10 = very stable (e.g. grocery), 0.25 = moderate (e.g. e-commerce), 0.40+ = highly volatile (e.g. seasonal or bursty)."
                  />
                  <SliderField
                    label="Significance level (alpha)"
                    value={alpha}
                    onChange={setAlpha}
                    min={0.01}
                    max={0.2}
                    step={0.01}
                    tooltip="The probability threshold for calling a result statistically significant. 0.05 (5%) is standard. Lower values are stricter but require more data. Higher values are more lenient but increase false positive risk."
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <PowerGauge power={result.power} />

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">
                  Min. detectable effect
                </span>
                <span className="font-semibold font-mono">{result.mde.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">
                  Expected incremental
                </span>
                <span className="font-semibold font-mono">
                  {Math.round(result.expectedIncrementalTotal).toLocaleString()}{" "}
                  conversions
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">
                  Treatment total
                </span>
                <span className="font-semibold font-mono">
                  {Math.round(
                    result.totalTreatmentConversions
                  ).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Control total</span>
                <span className="font-semibold font-mono">
                  {Math.round(result.totalControlConversions).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Recommendation */}
            <div
              className={`p-3 rounded-lg text-sm ${
                result.power >= 0.8
                  ? "bg-[#E8F0E8] text-[#3D6B42]"
                  : result.power >= 0.6
                    ? "bg-[#F5E6CC] text-[#96600A]"
                    : "bg-[#FDEEEA] text-[#E05D3A] border-l-4 border-[#E05D3A]"
              }`}
            >
              {result.power >= 0.8 ? (
                <p>
                  <strong>Good to go.</strong> Your test has enough power to
                  reliably detect a {liftPct}% lift. You can proceed with
                  confidence.
                </p>
              ) : result.power >= 0.6 ? (
                <p>
                  <strong>Borderline.</strong> You might detect a {liftPct}%
                  lift, but there&apos;s a meaningful chance you won&apos;t. Try
                  adding more geos, running longer, or targeting a larger effect.
                </p>
              ) : (
                <p>
                  <strong>Underpowered.</strong> This test is unlikely to detect
                  a {liftPct}% lift. To reach 80% power you need to detect at
                  least a {result.mde.toFixed(1)}% effect — or add more
                  geos/weeks.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How this works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            This calculator models your geo test as a two-sample comparison
            between treatment and control groups. It uses within-geo
            week-to-week variation (controlled by the coefficient of variation)
            to estimate the noise floor, then calculates the probability of
            detecting your expected lift at the chosen significance level.
          </p>
          <p>
            <strong>Power</strong> is the probability of correctly detecting a
            real effect. Industry standard is 80%. The{" "}
            <strong>minimum detectable effect (MDE)</strong> is the smallest
            lift your test can reliably detect at 80% power.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
