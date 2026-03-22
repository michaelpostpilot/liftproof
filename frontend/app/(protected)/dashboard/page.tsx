import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Experiment, CsvUpload } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: experiments } = await supabase
    .from("experiments")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: uploads } = await supabase
    .from("csv_uploads")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-12">
      <div className="flex items-end justify-between pb-8 border-b border-border/50">
        <div>
          <h1 className="font-serif italic text-4xl text-[#0B1D2E]">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your experiments and data uploads
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/upload">
            <Button variant="outline" className="uppercase tracking-wider text-[11px] font-bold">Upload Data</Button>
          </Link>
          <Link href="/experiments/new">
            <Button className="bg-[#0B1D2E] hover:bg-[#132D44] uppercase tracking-wider text-[11px] font-bold">New Experiment</Button>
          </Link>
        </div>
      </div>

      {/* Experiments */}
      <section>
        <h2 className="font-serif text-3xl text-[#0B1D2E] mb-6">Experiments</h2>
        {!experiments || experiments.length === 0 ? (
          <div className="bg-[#EDE9E0] p-10 rounded-xl shadow-sm space-y-8">
            <div>
              <h3 className="font-serif italic text-2xl text-[#0B1D2E] mb-1">Welcome to LiftProof</h3>
              <p className="text-sm text-muted-foreground">
                Measure the causal impact of your marketing in three steps
              </p>
            </div>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <span className="font-serif text-3xl text-[#0B1D2E]/20 shrink-0 w-8">01</span>
                <div>
                  <p className="font-semibold text-sm">Upload your data</p>
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV with one row per day per geographic region. You need a date column,
                    a geo column (state, DMA, or ZIP), and at least one numeric KPI like orders or revenue.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="font-serif text-3xl text-[#0B1D2E]/20 shrink-0 w-8">02</span>
                <div>
                  <p className="font-semibold text-sm">Design your experiment</p>
                  <p className="text-sm text-muted-foreground">
                    Select which geos received treatment (e.g., where you ran ads or sent mail) and which
                    are controls. Set your pre-period (baseline) and treatment period dates.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="font-serif text-3xl text-[#0B1D2E]/20 shrink-0 w-8">03</span>
                <div>
                  <p className="font-semibold text-sm">Get causal results</p>
                  <p className="text-sm text-muted-foreground">
                    LiftProof runs synthetic control, augmented SCM, and difference-in-differences models,
                    then ensembles them for robust lift estimates with p-values and confidence intervals.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <Link href="/upload">
                <Button size="lg" className="bg-[#0B1D2E] hover:bg-[#132D44] uppercase tracking-wider text-[11px] font-bold">Upload Your First CSV</Button>
              </Link>
              <div>
                <p className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider mb-2">Or try a sample dataset</p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/upload?sample=geo_test_sample.csv">
                    <Button size="sm" variant="outline" className="text-[11px]">States — Clean</Button>
                  </Link>
                  <Link href="/upload?sample=sample_moderate_noise.csv">
                    <Button size="sm" variant="outline" className="text-[11px]">States — Moderate</Button>
                  </Link>
                  <Link href="/upload?sample=sample_high_noise.csv">
                    <Button size="sm" variant="outline" className="text-[11px]">States — High Noise</Button>
                  </Link>
                  <Link href="/upload?sample=sample_null_effect.csv">
                    <Button size="sm" variant="outline" className="text-[11px]">States — Null Effect</Button>
                  </Link>
                  <Link href="/upload?sample=sample_dma_ecommerce.csv">
                    <Button size="sm" variant="outline" className="text-[11px]">DMA — Ecommerce (8%)</Button>
                  </Link>
                  <Link href="/upload?sample=sample_dma_retail.csv">
                    <Button size="sm" variant="outline" className="text-[11px]">DMA — Retail (15%)</Button>
                  </Link>
                  <Link href="/upload?sample=sample_dma_null.csv">
                    <Button size="sm" variant="outline" className="text-[11px]">DMA — Null Effect</Button>
                  </Link>
                  <Link href="/upload?sample=sample_dma_high_power.csv">
                    <Button size="sm" variant="outline" className="text-[11px]">DMA — High Power (5%)</Button>
                  </Link>
                  <Link href="/upload?sample=sample_dma_clean.csv">
                    <Button size="sm" variant="outline" className="text-[11px]">DMA — Clean (6%)</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(experiments as Experiment[]).map((exp) => (
              <Link key={exp.id} href={`/experiments/${exp.id}`}>
                <div className={`bg-white p-8 rounded-xl border border-border/60 shadow-sm group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[200px] ${
                  exp.status === "completed" ? "border-l-4 border-l-[#7A9E7E]" :
                  exp.status === "failed" ? "border-l-4 border-l-[#E05D3A]" :
                  exp.status === "running" ? "border-l-4 border-l-[#D4943A]" :
                  "border-l-4 border-l-[#D4CFC4]"
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <StatusBadge status={exp.status} />
                      <h3 className="font-serif text-xl text-[#0B1D2E]">{exp.name}</h3>
                    </div>
                  </div>
                  <div className="flex gap-8 mt-auto pt-6 border-t border-border/40">
                    <div className="flex flex-col">
                      <span className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider">Duration</span>
                      <span className="text-sm font-semibold font-mono">{exp.treatment_start} &mdash; {exp.treatment_end}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider">KPI</span>
                      <span className="text-sm font-semibold">{exp.primary_kpi}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider">Geos</span>
                      <span className="text-sm font-semibold font-mono">{exp.treatment_geos.length} treatment</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Uploads */}
      <section>
        <h2 className="font-serif text-3xl text-[#0B1D2E] mb-6">Data Uploads</h2>
        {!uploads || uploads.length === 0 ? (
          <p className="text-muted-foreground">
            No uploads yet.{" "}
            <Link href="/upload" className="text-blue-600 hover:underline">
              Start by uploading a CSV with daily geo-level data.
            </Link>
          </p>
        ) : (
          <div className="grid gap-3">
            {(uploads as CsvUpload[]).map((upload) => (
              <Card key={upload.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{upload.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      {upload.row_count?.toLocaleString()} rows
                      {upload.geo_granularity && ` \u00B7 ${upload.geo_granularity}`}
                      {upload.date_range_start && ` \u00B7 ${upload.date_range_start} to ${upload.date_range_end}`}
                    </p>
                  </div>
                  <Badge variant={upload.validation_status === "valid" ? "default" : "secondary"}>
                    {upload.validation_status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <div className="mt-4">
          <p className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider mb-2">Load sample dataset</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/upload?sample=geo_test_sample.csv">
              <Button size="sm" variant="outline" className="text-[11px]">States — Clean</Button>
            </Link>
            <Link href="/upload?sample=sample_moderate_noise.csv">
              <Button size="sm" variant="outline" className="text-[11px]">States — Moderate</Button>
            </Link>
            <Link href="/upload?sample=sample_high_noise.csv">
              <Button size="sm" variant="outline" className="text-[11px]">States — High Noise</Button>
            </Link>
            <Link href="/upload?sample=sample_null_effect.csv">
              <Button size="sm" variant="outline" className="text-[11px]">States — Null Effect</Button>
            </Link>
            <Link href="/upload?sample=sample_dma_ecommerce.csv">
              <Button size="sm" variant="outline" className="text-[11px]">DMA — Ecommerce (8%)</Button>
            </Link>
            <Link href="/upload?sample=sample_dma_retail.csv">
              <Button size="sm" variant="outline" className="text-[11px]">DMA — Retail (15%)</Button>
            </Link>
            <Link href="/upload?sample=sample_dma_null.csv">
              <Button size="sm" variant="outline" className="text-[11px]">DMA — Null Effect</Button>
            </Link>
            <Link href="/upload?sample=sample_dma_high_power.csv">
              <Button size="sm" variant="outline" className="text-[11px]">DMA — High Power (5%)</Button>
            </Link>
            <Link href="/upload?sample=sample_dma_clean.csv">
              <Button size="sm" variant="outline" className="text-[11px]">DMA — Clean (6%)</Button>
            </Link>
          </div>
        </div>
      </section>
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
