"use client";

import { motion } from "framer-motion";

const VERDICTS = [
  { name: "Genuine uplift", desc: "High score, built to work" },
  { name: "Works despite itself", desc: "Real impact, designed for visibility" },
  { name: "Solid — watch the outcomes", desc: "Good design, mid-range impact so far" },
  { name: "Looks good on paper", desc: "Mid-range impact, built for optics" },
  { name: "Designed to be seen, not to work", desc: "Low impact, low integrity" },
  { name: "Well-meaning dud", desc: "Low impact, genuinely intended" },
];

interface HowWeScoreProps {
  onBack: () => void;
}

export default function HowWeScore({ onBack }: HowWeScoreProps) {
  return (
    <motion.div
      className="max-w-[620px] mx-auto pb-12"
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

      <p className="text-[11px] tracking-[0.12em] uppercase text-muted mb-2">
        methodology
      </p>
      <h1 className="font-method-display text-[28px] leading-[1.2] text-text mb-2">
        How we score a scheme
      </h1>
      <p className="text-[14px] text-text-65 leading-[1.65] mb-8 max-w-[500px]">
        We research the scheme before scoring it. Then we run it through three measures and combine them.
        The formula is a geometric mean — not an average, not a raw product.
      </p>

      {/* Formula block */}
      <div className="bg-surface rounded-[10px] p-4 px-5 mb-5">
        <div className="flex items-center gap-2 flex-wrap mb-2.5">
          <span className="px-3 py-1.5 rounded-md text-[13px] font-medium bg-[#E1F5EE] text-[#085041]">
            Policy
          </span>
          <span className="text-[16px] text-muted">×</span>
          <span className="px-3 py-1.5 rounded-md text-[13px] font-medium bg-[#EEEDFE] text-[#3C3489]">
            Hidden cost
          </span>
          <span className="text-[16px] text-muted">×</span>
          <span className="px-3 py-1.5 rounded-md text-[13px] font-medium bg-[#FAECE7] text-[#712B13]">
            Dignity
          </span>
          <span className="text-[16px] text-muted">→</span>
          <span className="text-[13px] font-medium text-text">Overall score</span>
        </div>
        <p className="text-[12px] text-muted leading-[1.6]">
          Geometric mean: a weak layer still drags the score down, but a solid scheme with no single
          standout dimension isn&apos;t punished for being consistently decent.
        </p>
        <p className="text-[12px] text-text-65 mt-2.5 pl-3 border-l-2 border-border-secondary leading-[1.6]">
          Hard floor: if any layer scores below 25, the overall score is capped at 40. A scheme that
          fails badly on one dimension cannot be rescued by the other two.
        </p>
      </div>

      {/* Layers */}
      <div className="flex flex-col gap-2.5 mb-0">
        {/* Policy */}
        <div className="border border-border rounded-[10px] p-3.5 px-4">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[10px] font-semibold tracking-[0.1em] uppercase px-[7px] py-[2px] rounded-[3px] bg-[#E1F5EE] text-[#085041]">
              Policy
            </span>
            <span className="text-[13px] font-medium text-text">What the spreadsheet sees</span>
          </div>
          <p className="text-[13px] text-text-65 leading-[1.7]">
            Cost per beneficiary. Whether the poorest actually got it or the benefit spread across everyone
            equally. And the long-term impact chain — <strong className="font-medium text-text">deferred is not the same as weak.</strong> A
            scheme that raises children&apos;s future earnings scores higher than one that hands out cash once
            and disappears.
          </p>
        </div>

        {/* Hidden cost */}
        <div className="border border-border rounded-[10px] p-3.5 px-4">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[10px] font-semibold tracking-[0.1em] uppercase px-[7px] py-[2px] rounded-[3px] bg-[#EEEDFE] text-[#3C3489]">
              Hidden cost
            </span>
            <span className="text-[13px] font-medium text-text">What people had to do before</span>
          </div>
          <p className="text-[13px] text-text-65 leading-[1.7]">
            Before this scheme, how did people get this thing? Did they borrow, beg, pay a middleman, perform
            social labour, or go without? <strong className="font-medium text-text">The worse the workaround, the higher this
            score</strong> when the scheme ends it. We also ask whether the benefit lasts — and whether the next
            government can cancel it in a single budget.
          </p>
        </div>

        {/* Dignity */}
        <div className="border border-border rounded-[10px] p-3.5 px-4">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[10px] font-semibold tracking-[0.1em] uppercase px-[7px] py-[2px] rounded-[3px] bg-[#FAECE7] text-[#712B13]">
              Dignity
            </span>
            <span className="text-[13px] font-medium text-text">Whether it changed where you stand</span>
          </div>
          <p className="text-[13px] text-text-65 leading-[1.7]">
            The question changes by scheme type. For a physical object, it&apos;s whether it arrived at your
            home. For a service, it&apos;s whether it changed the terms of participation — eating with
            classmates instead of sitting hungry, attending a clinic without asking permission, competing for
            a job that was previously out of reach. <strong className="font-medium text-text">Did it change the terms of someone&apos;s
            life, not just their access to a thing.</strong>
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border my-7" />

      {/* Verdicts */}
      <p className="text-[11px] tracking-[0.1em] uppercase text-muted mb-3">
        Six possible verdicts
      </p>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {VERDICTS.map((v) => (
          <div key={v.name} className="border border-border rounded-lg px-3.5 py-2.5">
            <p className="text-[12px] font-medium text-text mb-0.5">{v.name}</p>
            <p className="text-[11px] text-muted leading-[1.5]">{v.desc}</p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-border my-7" />

      {/* Design integrity */}
      <p className="text-[11px] tracking-[0.1em] uppercase text-muted mb-3">
        Design integrity — separate from the score
      </p>
      <p className="text-[13px] text-text-65 leading-[1.7] mb-4">
        We don&apos;t penalise a government for winning an election on welfare promises and then delivering
        them. What we do look at: was outcome monitoring built in from the start? Was rollout by poverty
        index or by swing constituency? Did the opposition keep it running after winning power? These are
        the signals that separate a scheme built to work from one built to be photographed.
      </p>

      {/* Honest box */}
      <div className="border-l-2 border-border-secondary pl-4 py-3">
        <p className="text-[13px] text-text-65 leading-[1.7]">
          The verdict reflects impact. Design integrity shapes which label it gets. A scheme can do real
          good and still earn &ldquo;Works despite itself&rdquo; — that&apos;s not a consolation prize,
          it&apos;s an honest description.
        </p>
        <p className="text-[13px] text-text-65 leading-[1.7] mt-2">
          Every analysis ends with what the numbers miss. Every scheme has something that doesn&apos;t fit here.
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
