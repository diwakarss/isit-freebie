"use client";

import { motion } from "framer-motion";

const VERDICTS = [
  { name: "Genuine uplift", wsd: "≥72", di: "≥60", desc: "Changed lives. Designed to work." },
  { name: "Works despite itself", wsd: "≥72", di: "<60", desc: "Real impact. Designed to be seen." },
  { name: "Solid — watch the outcomes", wsd: "52–71", di: "≥60", desc: "Good design, needs more data." },
  { name: "Looks good on paper", wsd: "52–71", di: "<60", desc: "Mid impact, visibility-optimised." },
  { name: "Designed to be seen, not to work", wsd: "<52", di: "<35", desc: "Low impact, low integrity." },
  { name: "Well-meaning dud", wsd: "<52", di: "≥35", desc: "Low impact, genuinely intended." },
];

const ARCHETYPES = [
  { type: "A", name: "Physical asset", example: "TV, laptop, bicycle, housing", question: "Did it arrive at home?" },
  { type: "B", name: "Access enablement", example: "Ration card, Aadhaar, bank account", question: "Did it remove a human gatekeeper?" },
  { type: "C", name: "Infrastructure", example: "Toilet, tap water, electricity", question: "Did it end a daily hardship?" },
  { type: "D", name: "Cash transfer", example: "MGNREGA wages, pension, DBT", question: "Did it end a dependency?" },
  { type: "E", name: "Service access", example: "School meals, healthcare, skills", question: "Did it change participation terms?" },
  { type: "F", name: "Competitive pathway", example: "UPSC coaching, JEE/NEET prep", question: "Did it open a class-restricted pathway?" },
];

interface HowWeScoreProps {
  onBack: () => void;
}

export default function HowWeScore({ onBack }: HowWeScoreProps) {
  return (
    <motion.div
      className="max-w-[640px] mx-auto pb-12"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-[13px] text-muted hover:text-text transition-colors cursor-pointer
          bg-transparent border-0 font-body mb-6 flex items-center gap-1"
      >
        ← Back to result
      </button>

      <p className="text-[12px] tracking-[0.12em] uppercase text-muted mb-2">
        WSD v1.3 methodology
      </p>
      <h1 className="font-method-display text-[28px] leading-[1.2] text-text mb-2">
        How we score a scheme
      </h1>
      <p className="text-[15px] text-text-65 leading-[1.6] mb-8 max-w-[480px]">
        Three layers combined using a geometric mean. A scheme that fails one layer can&apos;t be rescued
        by the others. If any layer scores below 25, the total is capped at 40.
      </p>

      {/* Formula */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="px-3.5 py-2 rounded-md text-[14px] font-medium bg-[#E1F5EE] text-[#085041]">
          Policy
        </span>
        <span className="text-[18px] text-muted px-0.5">×</span>
        <span className="px-3.5 py-2 rounded-md text-[14px] font-medium bg-[#EEEDFE] text-[#3C3489]">
          Hidden cost
        </span>
        <span className="text-[18px] text-muted px-0.5">×</span>
        <span className="px-3.5 py-2 rounded-md text-[14px] font-medium bg-[#FAECE7] text-[#712B13]">
          Dignity
        </span>
        <span className="text-[15px] text-muted px-0.5">^(1/3) × 100</span>
        <span className="text-[18px] text-muted px-0.5">=</span>
        <span className="px-3.5 py-2 rounded-md text-[14px] font-medium bg-surface text-text border border-border">
          Overall score
        </span>
      </div>

      {/* Layers */}
      <div className="flex flex-col gap-3 mb-8">
        {/* Policy */}
        <div className="border border-border rounded-xl p-4 hover:border-border-secondary transition-colors">
          <div className="flex items-baseline gap-2.5 mb-1.5">
            <span className="text-[11px] font-medium tracking-[0.1em] uppercase px-2 py-0.5 rounded bg-[#E1F5EE] text-[#085041]">
              Policy
            </span>
            <span className="text-[15px] font-medium text-text">What the spreadsheet sees</span>
          </div>
          <p className="text-[14px] text-text-65 leading-[1.65] mb-2">
            Fiscal cost, whether the poorest actually received it, and whether lasting economic activity followed.
          </p>
          <div className="flex gap-4 text-[12px] text-muted">
            <span>Fiscal health <strong className="text-text">25%</strong></span>
            <span>Reaches poorest <strong className="text-text">40%</strong></span>
            <span>Long-term impact <strong className="text-text">35%</strong></span>
          </div>
        </div>

        {/* Hidden cost */}
        <div className="border border-border rounded-xl p-4 hover:border-border-secondary transition-colors">
          <div className="flex items-baseline gap-2.5 mb-1.5">
            <span className="text-[11px] font-medium tracking-[0.1em] uppercase px-2 py-0.5 rounded bg-[#EEEDFE] text-[#3C3489]">
              Hidden cost
            </span>
            <span className="text-[15px] font-medium text-text">What people had to do before</span>
          </div>
          <p className="text-[14px] text-text-65 leading-[1.65] mb-2">
            Before this scheme, how did people get this thing? Borrow, beg, pay a middleman, stand outside a window?
            The worse the workaround, the higher this score — because eliminating it is the real value.
          </p>
          <div className="flex gap-3 text-[12px] text-muted flex-wrap">
            <span>Workaround <strong className="text-text">35%</strong></span>
            <span>Power disrupted <strong className="text-text">30%</strong></span>
            <span>Lasts <strong className="text-text">20%</strong></span>
            <span>Cancellable <strong className="text-text">15%</strong></span>
          </div>
          <p className="text-[12px] text-text-50 mt-2 italic">
            Monetary floor: if the workaround cost ≥3% of daily wages, severity scores at least 75.
          </p>
        </div>

        {/* Dignity */}
        <div className="border border-border rounded-xl p-4 hover:border-border-secondary transition-colors">
          <div className="flex items-baseline gap-2.5 mb-1.5">
            <span className="text-[11px] font-medium tracking-[0.1em] uppercase px-2 py-0.5 rounded bg-[#FAECE7] text-[#712B13]">
              Dignity
            </span>
            <span className="text-[15px] font-medium text-text">Did it change where you stand</span>
          </div>
          <p className="text-[14px] text-text-65 leading-[1.65] mb-2">
            Did it arrive at your home or did you go get it? Did people celebrate, stay home for days, call relatives?
            Did language shift from &ldquo;the TV I watch at the neighbour&apos;s&rdquo; to &ldquo;our TV&rdquo;?
            The question changes by scheme type — see archetypes below.
          </p>
          <div className="flex gap-4 text-[12px] text-muted">
            <span>Changed standing <strong className="text-text">40%</strong></span>
            <span>Reaction <strong className="text-text">35%</strong></span>
            <span>Language shift <strong className="text-text">25%</strong></span>
          </div>
        </div>
      </div>

      {/* Scheme Archetypes */}
      <div className="mb-8">
        <p className="text-[12px] tracking-[0.1em] uppercase text-muted mb-2.5">
          Scheme archetypes
        </p>
        <p className="text-[14px] text-text-65 leading-[1.6] mb-3">
          Every scheme is classified before scoring. The archetype determines which dignity question applies.
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2">
          {ARCHETYPES.map((a) => (
            <div key={a.type} className="border border-border rounded-lg px-3.5 py-3">
              <p className="text-[13px] font-medium text-text mb-0.5">
                <span className="text-muted">Type {a.type}:</span> {a.name}
              </p>
              <p className="text-[11px] text-muted leading-[1.4] mb-1">{a.example}</p>
              <p className="text-[11px] text-text-65 italic leading-[1.4]">&ldquo;{a.question}&rdquo;</p>
            </div>
          ))}
        </div>
      </div>

      {/* Disambiguation */}
      <div className="mb-8">
        <p className="text-[12px] tracking-[0.1em] uppercase text-muted mb-2.5">
          Scheme disambiguation
        </p>
        <div className="border border-border rounded-xl p-4">
          <p className="text-[14px] text-text-65 leading-[1.65]">
            Many policy ideas exist in multiple states. Free bus for women runs in Tamil Nadu, Delhi, Karnataka, and others.
            The engine pins down the exact state, year, and local name before scoring. Evidence from a different state&apos;s
            version cannot influence the score.
          </p>
        </div>
      </div>

      {/* Design Integrity */}
      <div className="mb-8">
        <p className="text-[12px] tracking-[0.1em] uppercase text-muted mb-2.5">
          Design integrity
        </p>
        <div className="border border-border rounded-xl p-4">
          <p className="text-[14px] text-text-65 leading-[1.65] mb-3">
            Separate from the overall score. Was this scheme designed to work, or to be seen?
            Winning an election on a welfare promise is democracy — we don&apos;t penalise that.
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
            <span className="text-[#22C55E]">+25 third-party verified outcomes</span>
            <span className="text-[#EF4444]">−20 no outcome monitoring</span>
            <span className="text-[#22C55E]">+20 opposition continued it</span>
            <span className="text-[#EF4444]">−20 constituency-first rollout</span>
            <span className="text-[#22C55E]">+15 independent evaluation</span>
            <span className="text-[#EF4444]">−15 fanfare, no plan</span>
            <span className="text-[#22C55E]">+15 rollout by need index</span>
            <span className="text-[#EF4444]">−10 heavy party branding</span>
            <span className="text-[#22C55E]">+10 needs-based amount</span>
            <span className="text-[#EF4444]">−10 round political number</span>
          </div>
        </div>
      </div>

      {/* Confidence */}
      <div className="mb-8">
        <p className="text-[12px] tracking-[0.1em] uppercase text-muted mb-2.5">
          Confidence band
        </p>
        <div className="flex gap-3">
          <div className="flex-1 border border-border rounded-lg px-3.5 py-2.5 text-center">
            <p className="text-[14px] font-medium text-text">±8</p>
            <p className="text-[11px] text-muted">High — verified outcomes</p>
          </div>
          <div className="flex-1 border border-border rounded-lg px-3.5 py-2.5 text-center">
            <p className="text-[14px] font-medium text-text">±15</p>
            <p className="text-[11px] text-muted">Medium — reports, press</p>
          </div>
          <div className="flex-1 border border-border rounded-lg px-3.5 py-2.5 text-center">
            <p className="text-[14px] font-medium text-text">±22</p>
            <p className="text-[11px] text-muted">Low — limited data</p>
          </div>
        </div>
      </div>

      {/* Verdicts */}
      <div className="mb-8">
        <p className="text-[12px] tracking-[0.1em] uppercase text-muted mb-2.5">
          The six verdicts
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
          {VERDICTS.map((v) => (
            <div key={v.name} className="border border-border rounded-lg px-4 py-3">
              <p className="text-[14px] font-medium text-text mb-0.5">{v.name}</p>
              <p className="text-[11px] text-muted leading-[1.4]">
                WSD {v.wsd} · DI {v.di}
              </p>
              <p className="text-[12px] text-text-50 leading-[1.4] mt-1">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Honest box */}
      <div className="border-l-2 border-border-secondary pl-4 rounded-none mb-2">
        <p className="text-[14px] text-text-65 leading-[1.65]">
          Electoral timing doesn&apos;t tank the score. A scheme can earn &ldquo;Works despite
          itself&rdquo; — the TVs still ended something real even if the design was visibility-optimised.
          We also name what the numbers miss in every analysis.
        </p>
      </div>

      {/* Back */}
      <button
        onClick={onBack}
        className="mt-8 px-6 py-3 bg-accent text-bg font-body font-semibold text-[14px]
          rounded-md cursor-pointer hover:opacity-85 transition-opacity"
      >
        Back to result
      </button>
    </motion.div>
  );
}
