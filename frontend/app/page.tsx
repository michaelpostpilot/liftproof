import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white antialiased">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 h-16 flex items-center justify-between bg-white/92 backdrop-blur-md border-b border-black/[0.06]">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-serif text-[22px] text-[#0B1D2C] tracking-tight">LiftProof</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="#steps" className="hidden md:block text-sm text-[#4A5568] hover:text-[#0B1D2C] transition-colors">
            How it works
          </Link>
          <Link href="#methodology" className="hidden md:block text-sm text-[#4A5568] hover:text-[#0B1D2C] transition-colors">
            Methodology
          </Link>
          <Link href="/login" className="text-sm text-[#4A5568] hover:text-[#0B1D2C] transition-colors">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-[#0B1D2C] rounded-lg hover:bg-[#1a3148] transition-all hover:-translate-y-px"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 md:pb-28 px-6 md:px-12 max-w-[1200px] mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-center">
        <div className="max-w-[560px]">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#EBF4FF] rounded-full text-xs font-medium tracking-wide text-[#2B6CB0] mb-7">
            <span className="w-1.5 h-1.5 bg-[#3182CE] rounded-full" />
            Free forever · No credit card
          </div>
          <h1 className="font-serif text-4xl md:text-[52px] font-normal leading-[1.12] tracking-tight text-[#0B1D2C] mb-6">
            Prove which channels <em className="italic text-[#2B6CB0]">actually</em> drive revenue
          </h1>
          <p className="text-lg leading-relaxed text-[#4A5568] mb-10 max-w-[480px]">
            LiftProof uses synthetic control methods and causal inference to measure
            the true incremental impact of your marketing. The same methodology as
            $100K/year tools — completely free.
          </p>
          <div className="flex flex-wrap gap-3.5">
            <Link
              href="/signup"
              className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-[#0B1D2C] rounded-lg hover:bg-[#1a3148] transition-all hover:-translate-y-px"
            >
              Start your first experiment →
            </Link>
            <Link
              href="#steps"
              className="inline-flex items-center px-6 py-3 text-sm font-medium text-[#0B1D2C] bg-transparent border border-[#E2E8F0] rounded-lg hover:border-[#4A5568] transition-all hover:-translate-y-px"
            >
              See how it works
            </Link>
          </div>
          <div className="flex items-center gap-5 mt-12 pt-8 border-t border-[#E2E8F0]">
            <div className="flex flex-col">
              <span className="font-serif text-[28px] text-[#0B1D2C] leading-none">3</span>
              <span className="text-xs text-[#718096] mt-1">Free experiments / month</span>
            </div>
            <div className="w-px h-10 bg-[#E2E8F0]" />
            <div className="flex flex-col">
              <span className="font-serif text-[28px] text-[#0B1D2C] leading-none">0</span>
              <span className="text-xs text-[#718096] mt-1">Lines of code required</span>
            </div>
            <div className="w-px h-10 bg-[#E2E8F0]" />
            <div className="flex flex-col">
              <span className="font-serif text-[28px] text-[#0B1D2C] leading-none">&lt;60s</span>
              <span className="text-xs text-[#718096] mt-1">To get causal results</span>
            </div>
          </div>
        </div>

        {/* Hero Visual — Mock Results Card */}
        <div className="relative hidden md:flex justify-center">
          <div className="absolute w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(43,108,176,0.08)_0%,transparent_70%)] -top-10 -right-16 z-0 pointer-events-none" />
          <div className="relative z-10 w-[420px] bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-[0_4px_32px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[13px] font-medium text-[#0B1D2C]">CTV Ads — Q1 Holdout Test</span>
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#E6FFFA] text-[#276749]">
                Significant
              </span>
            </div>
            <div className="text-center py-5 pb-6 border-b border-[#E2E8F0] mb-5">
              <div className="font-serif text-[56px] text-[#38A169] leading-none">+12.3%</div>
              <div className="text-[13px] text-[#718096] mt-1.5">Incremental revenue lift</div>
              <div className="text-xs text-[#A0AEC0] mt-1">95% CI: [+6.1%, +18.5%] · p = 0.002</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "8.2x", label: "iROAS" },
                { value: "$12.40", label: "Cost per incr. acquisition" },
                { value: "$47.2K", label: "Incremental revenue" },
                { value: "0.84", label: "Statistical power" },
              ].map((m) => (
                <div key={m.label} className="p-3.5 bg-[#F7FAFC] rounded-xl">
                  <div className="font-serif text-[22px] text-[#0B1D2C]">{m.value}</div>
                  <div className="text-[11px] text-[#718096] mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Proof Bar */}
      <div className="py-5 text-center border-y border-[#E2E8F0] bg-[#F7FAFC]">
        <p className="text-[13px] tracking-[0.06em] uppercase text-[#A0AEC0] font-medium">
          Powered by the same synthetic control methods used by Meta, Google, and leading econometricians
        </p>
      </div>

      {/* How It Works */}
      <section id="steps" className="py-24 md:py-28 px-6 md:px-12 max-w-[1200px] mx-auto scroll-mt-16">
        <div className="text-xs font-medium tracking-[0.08em] uppercase text-[#2B6CB0] mb-4">
          How it works
        </div>
        <h2 className="font-serif text-3xl md:text-[40px] font-normal leading-[1.2] tracking-tight text-[#0B1D2C] mb-4 max-w-[500px]">
          Three steps to causal proof
        </h2>
        <p className="text-[17px] text-[#4A5568] leading-relaxed mb-16 max-w-[500px]">
          No data science team required. Upload your data, design your experiment,
          and let our engine handle the econometrics.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              num: "01",
              title: "Upload your sales data",
              desc: "Drop in a CSV with daily orders or revenue by geographic region. We auto-detect your geo format, validate everything, and flag issues before you commit.",
              tag: "Shopify · Amazon · Any source",
            },
            {
              num: "02",
              title: "Design your experiment",
              desc: "Our copilot helps you choose treatment and control regions, runs power analysis, and recommends the test design with the lowest detectable effect.",
              tag: "Power analysis · Market selection",
            },
            {
              num: "03",
              title: "Get causal results",
              desc: "Multi-model synthetic control ensemble delivers lift estimates, confidence intervals, and p-values. Export a PDF report your CFO will actually trust.",
              tag: "Lift · iROAS · CPIA · Confidence intervals",
            },
          ].map((step) => (
            <div
              key={step.num}
              className="group p-9 border border-[#E2E8F0] rounded-2xl transition-all duration-300 hover:border-[rgba(43,108,176,0.2)] hover:shadow-[0_8px_32px_rgba(43,108,176,0.06)] hover:-translate-y-1"
            >
              <div className="font-serif text-[64px] text-[#E2E8F0] leading-none mb-5 transition-colors duration-300 group-hover:text-[rgba(43,108,176,0.15)]">
                {step.num}
              </div>
              <h3 className="text-lg font-medium text-[#0B1D2C] mb-3">{step.title}</h3>
              <p className="text-[15px] leading-relaxed text-[#4A5568]">{step.desc}</p>
              <span className="inline-block mt-4 px-2.5 py-1 text-[11px] font-medium rounded-md bg-[#F7FAFC] text-[#718096] border border-[#E2E8F0]">
                {step.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Metrics Section */}
      <section id="methodology" className="py-24 md:py-28 px-6 md:px-12 bg-[#0B1D2C] text-white relative overflow-hidden scroll-mt-16">
        <div className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(43,108,176,0.25)_0%,transparent_70%)] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="text-xs font-medium tracking-[0.08em] uppercase text-[#3182CE] mb-4">
            Beyond vanity metrics
          </div>
          <h2 className="font-serif text-3xl md:text-[40px] font-normal leading-[1.2] tracking-tight text-white mb-3">
            The numbers that actually matter
          </h2>
          <p className="text-[17px] text-white/60 leading-relaxed mb-14 max-w-[500px]">
            Get causally-proven incrementality metrics grounded in experimental evidence.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                ),
                iconClass: "bg-[rgba(49,130,206,0.2)] text-[#63B3ED]",
                title: "Incremental Lift",
                label: "Primary metric",
                desc: "The true causal effect of your campaign — what happened because of your ads vs. what would have happened anyway.",
              },
              {
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                ),
                iconClass: "bg-[rgba(56,161,105,0.2)] text-[#68D391]",
                title: "iROAS",
                label: "Efficiency",
                desc: "Incremental return on ad spend. Proven dollars back for every dollar invested — not platform-reported guesses.",
              },
              {
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                ),
                iconClass: "bg-[rgba(128,90,213,0.2)] text-[#B794F4]",
                title: "p-value",
                label: "Confidence",
                desc: "Statistical significance via Fisher permutation testing. Know whether your results are real signal before you act.",
              },
              {
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                ),
                iconClass: "bg-[rgba(237,137,54,0.2)] text-[#FBD38D]",
                title: "CPIA",
                label: "Unit economics",
                desc: "Cost per incremental acquisition. What you actually paid for each customer who wouldn't have converted otherwise.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="p-7 border border-white/10 rounded-2xl bg-white/[0.04] backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08]"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-5 ${card.iconClass}`}>
                  {card.icon}
                </div>
                <h3 className="font-serif text-2xl font-normal text-white mb-1.5">{card.title}</h3>
                <div className="text-[11px] font-medium tracking-[0.06em] uppercase text-white/40 mb-3.5">
                  {card.label}
                </div>
                <p className="text-sm leading-relaxed text-white/55">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-24 md:py-28 px-6 md:px-12 max-w-[1200px] mx-auto">
        <div className="text-xs font-medium tracking-[0.08em] uppercase text-[#2B6CB0] mb-4 text-center">
          Why LiftProof
        </div>
        <h2 className="font-serif text-3xl md:text-[40px] font-normal leading-[1.2] tracking-tight text-[#0B1D2C] mb-3 text-center">
          Enterprise methodology. Zero enterprise pricing.
        </h2>
        <p className="text-[17px] text-[#4A5568] leading-relaxed mb-14 max-w-[520px] mx-auto text-center">
          The same synthetic control methods used by $100K/year platforms — with
          an AI copilot instead of a billable human strategist.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-[#E2E8F0] rounded-2xl overflow-hidden text-sm">
            <thead>
              <tr>
                <th className="bg-[#F7FAFC] px-7 py-4.5 text-left text-[13px] font-medium text-[#718096] tracking-wide border-b border-[#E2E8F0]" />
                <th className="bg-[#2B6CB0] px-7 py-4.5 text-left text-[13px] font-medium text-white tracking-wide border-b border-[#E2E8F0]">
                  LiftProof
                </th>
                <th className="bg-[#F7FAFC] px-7 py-4.5 text-left text-[13px] font-medium text-[#718096] tracking-wide border-b border-[#E2E8F0]">
                  Paid services
                </th>
                <th className="bg-[#F7FAFC] px-7 py-4.5 text-left text-[13px] font-medium text-[#718096] tracking-wide border-b border-[#E2E8F0]">
                  DIY (GeoLift R)
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Price", <strong key="p">Free</strong>, "$50–100K+/year", "Free (R skills required)"],
                [
                  "Methodology",
                  <><span className="text-[#38A169] font-semibold">✓</span> Multi-model ensemble</>,
                  <><span className="text-[#38A169] font-semibold">✓</span> Proprietary ensemble</>,
                  <><span className="text-[#38A169] font-semibold">✓</span> Single model</>,
                ],
                [
                  "Statistical rigor",
                  <><span className="text-[#38A169] font-semibold">✓</span> p-values + confidence intervals</>,
                  <><span className="text-[#38A169] font-semibold">✓</span> p-values + confidence intervals</>,
                  <><span className="text-[#38A169] font-semibold">✓</span> Confidence intervals</>,
                ],
                [
                  "Power analysis",
                  <><span className="text-[#38A169] font-semibold">✓</span> Automated</>,
                  <><span className="text-[#38A169] font-semibold">✓</span> Automated</>,
                  <><span className="text-[#38A169] font-semibold">✓</span> Manual in R</>,
                ],
                [
                  "Setup time",
                  <strong key="t">Minutes</strong>,
                  "Days–weeks",
                  "Days of coding",
                ],
                [
                  "Transparency",
                  <><span className="text-[#38A169] font-semibold">✓</span> Open methods</>,
                  <><span className="text-[#A0AEC0]">—</span> Proprietary</>,
                  <><span className="text-[#38A169] font-semibold">✓</span> Open source</>,
                ],
              ].map((row, i) => (
                <tr key={i} className={i < 5 ? "border-b border-[#E2E8F0]" : ""}>
                  <td className="px-7 py-4.5 font-medium text-[#0B1D2C]">{row[0]}</td>
                  <td className="px-7 py-4.5 bg-[#EBF4FF]">{row[1]}</td>
                  <td className="px-7 py-4.5">{row[2]}</td>
                  <td className="px-7 py-4.5">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-10 p-6 bg-[#F7FAFC] rounded-xl border border-[#E2E8F0] max-w-3xl mx-auto">
          <p className="text-sm leading-relaxed text-[#4A5568]">
            <span className="font-semibold text-[#0B1D2C]">Same math, same rigor.</span>{" "}
            LiftProof uses the exact same peer-reviewed statistical methods as enterprise
            geo-testing platforms — synthetic control, augmented synthetic control, and
            difference-in-differences. We combine all three into an ensemble for more
            accurate results, then validate with permutation testing so you know your
            results are real, not noise.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 text-center relative overflow-hidden bg-gradient-to-b from-white to-[#F7FAFC]">
        <div className="absolute w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(43,108,176,0.06)_0%,transparent_60%)] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <h2 className="font-serif italic text-4xl md:text-5xl font-normal leading-[1.2] tracking-tight text-[#0B1D2C] mb-4 relative z-10">
          Stop guessing. Start proving.
        </h2>
        <p className="text-[17px] text-[#4A5568] mb-10 relative z-10">
          3 free experiments per month. No credit card. No sales call. No PhD required.
        </p>
        <Link
          href="/signup"
          className="relative z-10 inline-flex items-center px-8 py-3.5 text-base font-medium text-white bg-[#0B1D2C] rounded-xl hover:bg-[#1a3148] transition-all hover:-translate-y-px"
        >
          Create free account →
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-10 border-t border-[#E2E8F0] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <p className="text-[13px] text-[#718096]">LiftProof · Built on open-source causal inference</p>
        <div className="flex gap-6">
          <Link href="#methodology" className="text-[13px] text-[#718096] hover:text-[#0B1D2C] transition-colors">
            Methodology
          </Link>
          <Link href="#" className="text-[13px] text-[#718096] hover:text-[#0B1D2C] transition-colors">
            Docs
          </Link>
          <Link href="#" className="text-[13px] text-[#718096] hover:text-[#0B1D2C] transition-colors">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
