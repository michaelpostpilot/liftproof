"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GeoSelector } from "@/components/experiment/geo-selector";
import { DesignQuality } from "@/components/experiment/design-quality";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { useCopilot } from "@/components/copilot/copilot-provider";
import type { CsvUpload } from "@/types/database";
import Papa from "papaparse";

export default function NewExperimentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [uploads, setUploads] = useState<CsvUpload[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<CsvUpload | null>(null);
  const [availableGeos, setAvailableGeos] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [dateRange, setDateRange] = useState<{ min: string; max: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [primaryKpi, setPrimaryKpi] = useState("");
  const [treatmentGeos, setTreatmentGeos] = useState<string[]>([]);
  const [prePeriodStart, setPrePeriodStart] = useState("");
  const [prePeriodEnd, setPrePeriodEnd] = useState("");
  const [treatmentStart, setTreatmentStart] = useState("");
  const [treatmentEnd, setTreatmentEnd] = useState("");

  // Fetch uploads on mount
  useEffect(() => {
    async function fetchUploads() {
      const { data } = await supabase
        .from("csv_uploads")
        .select("*")
        .eq("validation_status", "valid")
        .order("created_at", { ascending: false });
      setUploads((data as CsvUpload[]) || []);
    }
    fetchUploads();
  }, []);

  // When upload is selected, parse CSV to extract geos and dates
  useEffect(() => {
    if (!selectedUpload) return;

    async function loadMeta() {
      const { data: fileData, error } = await supabase.storage
        .from("csv-uploads")
        .download(selectedUpload!.storage_path);

      if (error || !fileData) return;

      const text = await fileData.text();
      Papa.parse(text, {
        header: true,
        complete: (results) => {
          const rows = results.data as Record<string, string>[];
          setCsvRows(rows);
          const geoCol = selectedUpload!.geo_column!;
          const dateCol = selectedUpload!.date_column!;

          // Extract unique geos
          const geos = [...new Set(rows.map((r) => r[geoCol]).filter(Boolean))].sort();
          setAvailableGeos(geos);

          // Extract date range
          const dates = rows
            .map((r) => r[dateCol])
            .filter(Boolean)
            .map((d) => new Date(d))
            .filter((d) => !isNaN(d.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());

          if (dates.length > 0) {
            const minDate = dates[0].toISOString().split("T")[0];
            const maxDate = dates[dates.length - 1].toISOString().split("T")[0];
            setDateRange({ min: minDate, max: maxDate });

            // Smart defaults: use ~60% of data as pre-period, 40% as treatment
            const totalMs = dates[dates.length - 1].getTime() - dates[0].getTime();
            const splitDate = new Date(dates[0].getTime() + totalMs * 0.6);
            // Find the closest actual date to the 60% mark
            const splitIdx = dates.findIndex((d) => d.getTime() >= splitDate.getTime());
            const preEnd = dates[Math.max(0, splitIdx - 1)].toISOString().split("T")[0];
            const treatStart = dates[splitIdx].toISOString().split("T")[0];

            setPrePeriodStart(minDate);
            setPrePeriodEnd(preEnd);
            setTreatmentStart(treatStart);
            setTreatmentEnd(maxDate);
          }
        },
      });
    }

    loadMeta();
  }, [selectedUpload]);

  const controlGeos = useMemo(
    () => availableGeos.filter((g) => !treatmentGeos.includes(g)),
    [availableGeos, treatmentGeos]
  );

  const { setContext } = useCopilot();

  // Set copilot context
  useEffect(() => {
    setContext({
      page: "New Experiment",
      experiment: selectedUpload
        ? {
            primary_kpi: primaryKpi,
            treatment_geos: treatmentGeos,
            control_geos: controlGeos,
            pre_period_start: prePeriodStart,
            pre_period_end: prePeriodEnd,
            treatment_start: treatmentStart,
            treatment_end: treatmentEnd,
            geo_granularity: selectedUpload.geo_granularity,
          }
        : undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedUpload?.id,
    primaryKpi,
    treatmentGeos.length,
    controlGeos.length,
    prePeriodStart,
    prePeriodEnd,
    treatmentStart,
    treatmentEnd,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUpload || !primaryKpi || treatmentGeos.length === 0) {
      setError("Please fill in all required fields");
      return;
    }
    if (!prePeriodStart || !prePeriodEnd || !treatmentStart || !treatmentEnd) {
      setError("Please set all date ranges");
      return;
    }

    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const { data: experiment, error: dbError } = await supabase
      .from("experiments")
      .insert({
        user_id: user.id,
        csv_upload_id: selectedUpload.id,
        name: name || `Experiment ${new Date().toLocaleDateString()}`,
        status: "draft",
        experiment_type: "fixed_geo",
        hypothesis,
        primary_kpi: primaryKpi,
        geo_granularity: selectedUpload.geo_granularity || "state",
        treatment_geos: treatmentGeos,
        control_geos: controlGeos,
        treatment_start: treatmentStart,
        treatment_end: treatmentEnd,
        pre_period_start: prePeriodStart,
        pre_period_end: prePeriodEnd,
        spend_column: selectedUpload.spend_column,
      })
      .select()
      .single();

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
      return;
    }

    router.push(`/experiments/${experiment.id}`);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif italic text-4xl text-[#0B1D2E]">New Experiment</h1>
        <p className="text-muted-foreground">
          Design a geo-holdout experiment to measure the causal impact of your marketing.
        </p>
      </div>

      {/* How it works */}
      <div className="rounded-xl bg-[#EDE9E0] px-6 py-5 space-y-3">
        <p className="font-semibold text-sm text-[#0B1D2E]">How geo testing works</p>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div className="space-y-1">
            <p className="font-medium text-foreground">1. Pick treatment geos</p>
            <p>
              Select the geos (states, DMAs, etc.) where your campaign ran or
              will run. Everything else becomes a control.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">2. Set time periods</p>
            <p>
              The <strong>pre-period</strong> is the baseline before the
              campaign &mdash; LiftProof learns normal patterns here. The{" "}
              <strong>treatment period</strong> is when the campaign was active.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">3. Measure lift</p>
            <p>
              LiftProof builds a synthetic version of your treatment geos using
              the controls, then compares it to what actually happened to
              isolate the causal lift.
            </p>
          </div>
        </div>
      </div>

      {uploads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              You need to upload data before creating an experiment.
            </p>
            <Button onClick={() => router.push("/upload")}>Upload Data</Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Data Source */}
          <Card>
            <CardHeader>
              <CardTitle>Data Source</CardTitle>
              <CardDescription>Select the uploaded dataset and KPI you want to measure lift on.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Dataset *</Label>
                <Select
                  onValueChange={(id) => {
                    if (!id) return;
                    const upload = uploads.find((u) => u.id === id);
                    setSelectedUpload(upload || null);
                    if (upload?.kpi_columns?.[0]) {
                      setPrimaryKpi(upload.kpi_columns[0]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an uploaded dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {uploads.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.filename} ({u.row_count?.toLocaleString()} rows)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUpload && (
                <div className="space-y-2">
                  <Label>
                    Primary KPI *
                    <InfoTooltip content="The primary metric LiftProof will measure lift on. Choose the metric most directly impacted by your treatment (e.g., orders for a direct mail test, sessions for a media test)." />
                  </Label>
                  <Select value={primaryKpi} onValueChange={(v) => v && setPrimaryKpi(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedUpload.kpi_columns?.map((kpi) => (
                        <SelectItem key={kpi} value={kpi}>
                          {kpi}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Experiment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Experiment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Experiment Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., CTV Lift Test — Q1 2026"
                />
              </div>
              <div className="space-y-2">
                <Label>Hypothesis (optional)</Label>
                <Textarea
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  placeholder="e.g., CTV ads drive incremental revenue in treatment geos"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Geo Selection */}
          {selectedUpload && availableGeos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Geographic Assignment</CardTitle>
                <CardDescription>
                  Select the geos that received treatment (e.g., where you ran ads or sent mail).
                  All unselected geos become controls. More control geos improve the synthetic control fit.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Recommend Split */}
                <div className="rounded-xl bg-[#E8F0E8] border border-[#7A9E7E]/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#3D6B42]">
                        Not sure which geos to assign?
                      </p>
                      <p className="text-xs text-[#5C5B56] mt-0.5">
                        LiftProof will analyze your data and recommend the split
                        that maximizes pre-period fit quality.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={recommending || !primaryKpi || !prePeriodStart || !prePeriodEnd}
                      onClick={async () => {
                        setRecommending(true);
                        setError(null);
                        try {
                          // Refresh session to get a fresh access token
                          let accessToken = "";
                          const { data: refreshData, error: sessionError } = await supabase.auth.refreshSession();
                          if (sessionError || !refreshData.session) {
                            const { data: { session: fallbackSession } } = await supabase.auth.getSession();
                            if (!fallbackSession) throw new Error("Not authenticated — please sign in again");
                            accessToken = fallbackSession.access_token;
                          } else {
                            accessToken = refreshData.session.access_token;
                          }
                          const res = await fetch(
                            `${process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000"}/api/recommend/geo-split`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${accessToken}`,
                              },
                              body: JSON.stringify({
                                csv_upload_id: selectedUpload!.id,
                                kpi_column: primaryKpi,
                                n_treatment: Math.max(1, Math.round(availableGeos.length * 0.3)),
                                pre_period_start: prePeriodStart,
                                pre_period_end: prePeriodEnd,
                              }),
                            }
                          );
                          if (!res.ok) {
                            const errData = await res.json().catch(() => null);
                            throw new Error(errData?.detail || `Recommendation failed (${res.status})`);
                          }
                          const data = await res.json();
                          setTreatmentGeos(data.treatment_geos);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Recommendation failed");
                        } finally {
                          setRecommending(false);
                        }
                      }}
                    >
                      {recommending ? "Analyzing..." : "Recommend Split"}
                    </Button>
                  </div>
                  {!prePeriodStart || !prePeriodEnd ? (
                    <p className="text-xs text-[#5C5B56]">
                      Set the pre-period dates below first, then come back to get a recommendation.
                    </p>
                  ) : null}
                </div>

                <GeoSelector
                  availableGeos={availableGeos}
                  selectedGeos={treatmentGeos}
                  onSelectionChange={setTreatmentGeos}
                />
              </CardContent>
            </Card>
          )}

          {/* Date Ranges */}
          {selectedUpload && dateRange && (
            <Card>
              <CardHeader>
                <CardTitle>Time Periods</CardTitle>
                <CardDescription>
                  Define when the treatment started and the baseline period before it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-[#EDE9E0] px-4 py-3 text-sm text-[#5C5B56] space-y-1">
                  <p className="font-medium text-[#0B1D2E]">Tips for setting time periods</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[#5C5B56]">
                    <li>The <strong>pre-period</strong> should be at least 4&ndash;8 weeks before treatment started &mdash; ideally longer</li>
                    <li>Longer pre-periods give the model more baseline data to learn from</li>
                    <li>The <strong>treatment period</strong> is when your marketing intervention was active</li>
                    <li>Make sure the pre-period end and treatment start don&apos;t overlap</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  Data available: {dateRange.min} to {dateRange.max}
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Pre-Period Start *
                      <InfoTooltip content="The earliest date to use for baseline measurement. This should be well before any treatment activity began." />
                    </Label>
                    <Input
                      type="date"
                      value={prePeriodStart}
                      onChange={(e) => setPrePeriodStart(e.target.value)}
                      min={dateRange.min}
                      max={dateRange.max}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Pre-Period End *
                      <InfoTooltip content="The last day before treatment started. The model uses this period to learn the normal relationship between treatment and control geos." />
                    </Label>
                    <Input
                      type="date"
                      value={prePeriodEnd}
                      onChange={(e) => setPrePeriodEnd(e.target.value)}
                      min={prePeriodStart || dateRange.min}
                      max={dateRange.max}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Treatment Start *
                      <InfoTooltip content="The first day the treatment was active (e.g., when ads started running or mail was delivered)." />
                    </Label>
                    <Input
                      type="date"
                      value={treatmentStart}
                      onChange={(e) => setTreatmentStart(e.target.value)}
                      min={prePeriodEnd || dateRange.min}
                      max={dateRange.max}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Treatment End *
                      <InfoTooltip content="The last day of the treatment period you want to measure." />
                    </Label>
                    <Input
                      type="date"
                      value={treatmentEnd}
                      onChange={(e) => setTreatmentEnd(e.target.value)}
                      min={treatmentStart || dateRange.min}
                      max={dateRange.max}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Design Quality */}
          {selectedUpload &&
            csvRows.length > 0 &&
            treatmentGeos.length > 0 &&
            prePeriodStart &&
            prePeriodEnd &&
            treatmentStart &&
            treatmentEnd && (
              <DesignQuality
                rows={csvRows}
                geoCol={selectedUpload.geo_column!}
                dateCol={selectedUpload.date_column!}
                kpiCol={primaryKpi}
                treatmentGeos={treatmentGeos}
                controlGeos={controlGeos}
                prePeriodStart={prePeriodStart}
                prePeriodEnd={prePeriodEnd}
                treatmentStart={treatmentStart}
                treatmentEnd={treatmentEnd}
              />
            )}

          {error && (
            <div className="bg-[#FDEEEA] text-[#E05D3A] rounded-lg px-4 py-3 text-sm border border-[#E05D3A]/20">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !selectedUpload ||
                !primaryKpi ||
                treatmentGeos.length === 0 ||
                !treatmentStart ||
                !treatmentEnd ||
                !prePeriodStart ||
                !prePeriodEnd
              }
            >
              {loading ? "Creating..." : "Create Experiment"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
