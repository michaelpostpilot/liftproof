import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="px-8 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="font-serif text-2xl text-[#00152a]">LiftProof</span>
          <span className="uppercase tracking-wider text-[10px] font-semibold text-muted-foreground">by PostPilot</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-gradient-to-r from-[#00152a] to-[#102a43] text-white rounded-lg px-6">Get Started Free</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-32 max-w-4xl mx-auto">
        <div className="inline-block mb-6 uppercase tracking-[0.15em] text-[10px] font-bold text-muted-foreground">
          Free forever &middot; No credit card
        </div>
        <h1 className="font-serif italic text-5xl md:text-6xl tracking-tight text-[#00152a] mb-6 leading-tight">
          Measure the true incremental impact of your marketing
        </h1>
        <p className="text-lg text-muted-foreground mb-12 max-w-2xl leading-relaxed">
          LiftProof uses causal inference and synthetic control methods to prove
          which marketing channels actually drive revenue. The same methodology
          as $100K/year tools &mdash; completely free.
        </p>
        <div className="flex items-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="bg-gradient-to-r from-[#00152a] to-[#102a43] text-white text-sm px-8 py-3 rounded-xl uppercase tracking-widest font-bold">
              Start Your First Experiment
            </Button>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 bg-[#f4f3f5]">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif italic text-4xl text-[#00152a] mb-14">
            Three steps to causal measurement
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: "01", title: "Upload Your Data", desc: "Upload a CSV with daily orders or revenue by geographic region. We auto-detect your geo format and KPIs." },
              { num: "02", title: "Design Your Experiment", desc: "Select treatment and control regions, set your test period, and choose your KPIs. We handle the statistical design." },
              { num: "03", title: "Get Causal Results", desc: "Our multi-model ensemble delivers lift estimates, confidence intervals, and p-values. Export a PDF report for your CFO." },
            ].map((step) => (
              <div key={step.num} className="bg-white p-8 rounded-xl shadow-sm border border-white/80 hover:shadow-md transition-shadow">
                <span className="font-serif text-5xl text-[#00152a]/15 mb-4 block">{step.num}</span>
                <h3 className="font-serif text-xl text-[#00152a] mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics preview */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif italic text-4xl text-[#00152a] mb-3">
            The metrics that matter
          </h2>
          <p className="text-muted-foreground mb-14 max-w-2xl">
            Go beyond last-click attribution. LiftProof gives you causally-proven
            incrementality metrics.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { metric: "Incremental Lift", desc: "True causal effect of your campaign" },
              { metric: "iROAS", desc: "Incremental return on ad spend" },
              { metric: "p-value", desc: "Statistical confidence in your results" },
              { metric: "CPIA", desc: "Cost per incremental acquisition" },
            ].map((item) => (
              <div key={item.metric} className="bg-white p-6 rounded-xl shadow-sm border border-border/40">
                <div className="h-1 w-8 bg-[#00152a]/20 rounded-full mb-4" />
                <div className="font-serif text-2xl text-[#00152a] mb-1">{item.metric}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 bg-gradient-to-br from-[#00152a] via-[#102a43] to-[#00152a] text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif italic text-4xl mb-4">
            Stop guessing. Start proving.
          </h2>
          <p className="text-white/60 mb-10">
            3 free experiments per month. No credit card. No sales call.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-white text-[#00152a] hover:bg-white/90 text-sm px-8 py-3 rounded-xl uppercase tracking-widest font-bold">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="font-serif text-lg italic text-[#00152a]">Methodology Transparency</span>
          <p className="text-xs text-muted-foreground mt-1 max-w-md leading-relaxed">
            All experiments follow synthetic control and Fisher randomization frameworks. Confidence intervals are calculated at 95%.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">LiftProof by PostPilot</span>
      </footer>
    </div>
  );
}
