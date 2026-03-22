"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricsSummary } from "@/components/results/metrics-summary";
import { TreatmentVsSyntheticChart } from "@/components/results/treatment-vs-synthetic";
import { CumulativeLiftChart } from "@/components/results/cumulative-lift";
import { PlaceboHistogram } from "@/components/results/placebo-histogram";
import { ProgressTracker } from "@/components/results/progress-tracker";
import type { Experiment, ExperimentResult } from "@/types/database";

interface ProgressStep {
  step: string;
  label: string;
  progress: number;
}

export default function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [result, setResult] = useState<ExperimentResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [currentStep, setCurrentStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Fetch experiment and results
  const fetchData = useCallback(async () => {
    const { data: exp } = await supabase
      .from("experiments")
      .select("*")
      .eq("id", id)
      .single();

    if (exp) {
      setExperiment(exp as Experiment);

      if (exp.status === "completed") {
        const { data: res } = await supabase
          .from("experiment_results")
          .select("*")
          .eq("experiment_id", id)
          .single();

        if (res) setResult(res as ExperimentResult);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Run analysis via SSE
  async function runAnalysis() {
    setIsRunning(true);
    setError(null);
    setProgressSteps([]);

    // Update experiment status
    await supabase
      .from("experiments")
      .update({ status: "running" })
      .eq("id", id);

    setExperiment((prev) => (prev ? { ...prev, status: "running" } : prev));

    const controller = new AbortController();
    setAbortController(controller);

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

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000"}/api/analysis/stream/${id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        }
      );

      if (!response.ok) throw new Error("Analysis request failed");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.event === "progress") {
                const { step, progress } = event.data;
                setCurrentStep(step);
                setProgressSteps((prev) => {
                  const existing = prev.find((s) => s.step === step);
                  if (existing) {
                    return prev.map((s) =>
                      s.step === step ? { ...s, progress } : s
                    );
                  }
                  return [...prev, { step, label: step, progress }];
                });
              } else if (event.event === "complete") {
                setIsRunning(false);
                await fetchData();
              } else if (event.event === "error") {
                throw new Error(event.data.message || "Analysis failed");
              }
            } catch (e) {
              // Skip non-JSON lines
            }
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setIsRunning(false);
        await supabase
          .from("experiments")
          .update({ status: "draft" })
          .eq("id", id);
        setExperiment((prev) => (prev ? { ...prev, status: "draft" } : prev));
      } else {
        setError(err instanceof Error ? err.message : "Analysis failed");
        setIsRunning(false);
        await supabase
          .from("experiments")
          .update({ status: "failed" })
          .eq("id", id);
        setExperiment((prev) => (prev ? { ...prev, status: "failed" } : prev));
      }
    } finally {
      setAbortController(null);
    }
  }

  function cancelAnalysis() {
    abortController?.abort();
  }

  if (!experiment) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading experiment...</p>
      </div>
    );
  }

  const treatmentStartIndex = result?.dates
    ? result.dates.findIndex((d) => d >= experiment.treatment_start)
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-serif italic text-4xl text-[#0B1D2E]">{experiment.name}</h1>
            <StatusBadge status={experiment.status} />
          </div>
          <p className="text-muted-foreground">
            {experiment.experiment_type === "fixed_geo" ? "Fixed Geo Test" : "Standard Geo Test"}
            {" \u00B7 "}
            {experiment.primary_kpi}
            {" \u00B7 "}
            {experiment.treatment_geos.length} treatment / {experiment.control_geos.length} control geos
          </p>
          {experiment.hypothesis && (
            <p className="text-sm text-muted-foreground mt-1 italic">
              &ldquo;{experiment.hypothesis}&rdquo;
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {experiment.status === "completed" && result && (
            <Button
              variant="outline"
              onClick={async () => {
                const { data: refreshData } = await supabase.auth.refreshSession();
                let pdfToken = refreshData.session?.access_token || "";
                if (!pdfToken) {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) return;
                  pdfToken = session.access_token;
                }
                const res = await fetch(
                  `${process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000"}/api/export/pdf/${id}`,
                  { headers: { Authorization: `Bearer ${pdfToken}` } }
                );
                if (!res.ok) return;
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `liftproof-report-${id.slice(0, 8)}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export PDF
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Back
          </Button>
        </div>
      </div>

      {/* Experiment config summary */}
      <Card className="bg-muted/30">
        <CardContent className="py-5 px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Pre-Period</p>
              <p className="font-semibold text-[#0B1D2E] mt-0.5 font-mono text-sm">{experiment.pre_period_start} to {experiment.pre_period_end}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Treatment Period</p>
              <p className="font-semibold text-[#0B1D2E] mt-0.5 font-mono text-sm">{experiment.treatment_start} to {experiment.treatment_end}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Treatment Geos</p>
              <p className="font-semibold text-[#0B1D2E] mt-0.5 text-sm">{experiment.treatment_geos.join(", ")}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Geo Granularity</p>
              <p className="font-semibold text-[#0B1D2E] mt-0.5 capitalize text-sm">{experiment.geo_granularity}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-[#FDEEEA] text-[#E05D3A] rounded-lg px-4 py-3 text-sm border border-[#E05D3A]/20">
          {error}
        </div>
      )}

      {/* Draft state: Run Analysis button */}
      {(experiment.status === "draft" || experiment.status === "failed") && !isRunning && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">
              {experiment.status === "failed"
                ? "The previous analysis failed. You can retry."
                : "Your experiment is configured. Run the analysis to get results."}
            </p>
            <Button size="lg" onClick={runAnalysis} className="bg-[#0B1D2E] hover:bg-[#132D44] text-white px-10 rounded-xl uppercase tracking-wider text-[11px] font-bold">
              {experiment.status === "failed" ? "Retry Analysis" : "Run Analysis"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Running state: Progress tracker */}
      {(isRunning || experiment.status === "running") && (
        <ProgressTracker steps={progressSteps} currentStep={currentStep} onCancel={cancelAnalysis} />
      )}

      {/* Completed state: Results */}
      {experiment.status === "completed" && result && (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="details">Technical Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <MetricsSummary result={result} />
            {result.treatment_series && result.synthetic_control_series && result.dates && (
              <TreatmentVsSyntheticChart
                dates={result.dates}
                treatmentSeries={result.treatment_series}
                syntheticSeries={result.synthetic_control_series}
                treatmentStartIndex={treatmentStartIndex}
                kpiLabel={experiment.primary_kpi}
              />
            )}
          </TabsContent>

          <TabsContent value="charts" className="space-y-4 mt-4">
            {result.treatment_series && result.synthetic_control_series && result.dates && (
              <TreatmentVsSyntheticChart
                dates={result.dates}
                treatmentSeries={result.treatment_series}
                syntheticSeries={result.synthetic_control_series}
                treatmentStartIndex={treatmentStartIndex}
                kpiLabel={experiment.primary_kpi}
              />
            )}
            {result.cumulative_lift_series && result.dates && (
              <CumulativeLiftChart
                dates={result.dates}
                cumulativeLift={result.cumulative_lift_series}
                ciLower={result.ci_lower_series}
                ciUpper={result.ci_upper_series}
                treatmentStartIndex={treatmentStartIndex}
              />
            )}
            {result.placebo_distribution && result.lift_amount !== null && (
              <PlaceboHistogram
                nullDistribution={result.placebo_distribution}
                observedEffect={result.lift_amount}
              />
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Raw Results</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-stone-50 rounded-lg p-4 overflow-auto max-h-96">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-[#E8F0E8] text-[#3D6B42]",
    failed: "bg-[#FDEEEA] text-[#E05D3A]",
    running: "bg-[#F5E6CC] text-[#96600A]",
    draft: "bg-[#EDE9E0] text-[#8A8880]",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${styles[status] || styles.draft}`}>
      {status === "running" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#96600A] animate-pulse mr-1.5" />}
      {status}
    </span>
  );
}
