"use client";

import { motion } from "framer-motion";

const VERDICTS = [
  { name: "Genuine uplift", when: "High impact, designed to work" },
  { name: "Works despite itself", when: "Real impact, designed to be seen" },
  { name: "Solid — watch the outcomes", when: "Good design, needs longitudinal data" },
  { name: "Looks good on paper", when: "Mid impact, visibility-optimised" },
  { name: "Designed to be seen, not to work", when: "Low impact, low integrity" },
  { name: "Well-meaning dud", when: "Low impact, genuinely intended" },
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
        className="text-[12px] text-muted hover:text-text transition-colors cursor-pointer
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
      <p className="text-[14px] text-text-65 leading-[1.6] mb-8 max-w-[480px]">
        Three things combined using a geometric mean — not averaged. A scheme that reaches the wrong
        people can&apos;t be saved by good fiscal numbers. If any layer scores below 25, the total is capped at 40.
      </p>

      {/* Formula */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        <span className="px-3.5 py-2 rounded-md text-[13px] font-medium bg-[#E1F5EE] text-[#085041]">
          Policy impact
        </span>
        <span className="text-[18px] text-muted px-0.5">×</span>
        <span className="px-3.5 py-2 rounded-md text-[13px] font-medium bg-[#EEEDFE] text-[#3C3489]">
          Hidden cost
        </span>
        <span className="text-[18px] text-muted px-0.5">×</span>
        <span className="px-3.5 py-2 rounded-md text-[13px] font-medium bg-[#FAECE7] text-[#712B13]">
          Dignity moment
        </span>
        <span className="text-[14px] text-muted px-0.5">^(1/3)</span>
        <span className="text-[18px] text-muted px-0.5">×</span>
        <span className="text-[14px] text-muted px-0.5">100</span>
        <span className="text-[18px] text-muted px-0.5">=</span>
        <span className="px-3.5 py-2 rounded-md text-[13px] font-medium bg-surface text-text border border-border">
          WSD score
        </span>
      </div>
      <p className="text-[12px] text-muted mb-8 pl-0.5">
        If any one layer scores below 25, the total score is capped at 40 — no exceptions.
      </p>

      {/* Layers */}
      <div className="flex flex-col gap-3 mb-8">
        {/* Policy */}
        <div className="border border-border rounded-xl p-4 hover:border-border-secondary transition-colors">
          <div className="flex items-baseline gap-2.5 mb-1.5">
            <span className="text-[10px] font-medium tracking-[0.1em] uppercase px-2 py-0.5 rounded bg-[#E1F5EE] text-[#085041]">
              Policy impact
            </span>
            <span className="text-[14px] font-medium text-text">What the spreadsheet sees</span>
          </div>
          <p className="text-[13px] text-text-65 leading-[1.65]">
            Fiscal cost per beneficiary. Whether the poorest actually received it, or whether the
            middle class got an equal share. Whether any lasting economic activity followed.
            Standard stuff — <strong className="font-medium text-text">necessary but not sufficient.</strong>
          </p>
        </div>

        {/* Hidden cost */}
        <div className="border border-border rounded-xl p-4 hover:border-border-secondary transition-colors">
          <div className="flex items-baseline gap-2.5 mb-1.5">
            <span className="text-[10px] font-medium tracking-[0.1em] uppercase px-2 py-0.5 rounded bg-[#EEEDFE] text-[#3C3489]">
              Hidden cost
            </span>
            <span className="text-[14px] font-medium text-text">What people had to do before</span>
          </div>
          <p className="text-[13px] text-text-65 leading-[1.65]">
            Before this scheme existed, how did people get this thing? Did they borrow from a
            neighbour? Pay a middleman? Stand outside a window? Work for access?{" "}
            <strong className="font-medium text-text">
              The worse the workaround, the higher this score
            </strong>{" "}
            — because eliminating it is the real value of the scheme, not the market price of what was delivered.
          </p>
        </div>

        {/* Dignity */}
        <div className="border border-border rounded-xl p-4 hover:border-border-secondary transition-colors">
          <div className="flex items-baseline gap-2.5 mb-1.5">
            <span className="text-[10px] font-medium tracking-[0.1em] uppercase px-2 py-0.5 rounded bg-[#FAECE7] text-[#712B13]">
              Dignity moment
            </span>
            <span className="text-[14px] font-medium text-text">What happened when it arrived</span>
          </div>
          <p className="text-[13px] text-text-65 leading-[1.65]">
            Did it come to your home, or did you have to go get it? Did people stay home for days,
            call relatives, behave unusually? Did the language shift from &ldquo;the TV I watch at
            the neighbour&apos;s&rdquo; to &ldquo;our TV&rdquo;?{" "}
            <strong className="font-medium text-text">
              That behavioral signal tells us how much prior exclusion this ended.
            </strong>
          </p>
        </div>
      </div>

      {/* Design Integrity */}
      <div className="mb-8">
        <p className="text-[11px] tracking-[0.1em] uppercase text-muted mb-2.5">
          Design integrity
        </p>
        <div className="border border-border rounded-xl p-4">
          <p className="text-[13px] text-text-65 leading-[1.65]">
            Separate from the WSD score. Asks: was this scheme designed to work, or designed to be seen?
            Winning an election on a welfare promise is democracy working correctly — we don&apos;t penalise that.
            What matters: was there outcome monitoring? Was rollout by need, not constituency? Did the opposition continue it?
          </p>
        </div>
      </div>

      {/* Verdicts */}
      <div className="mb-8">
        <p className="text-[11px] tracking-[0.1em] uppercase text-muted mb-2.5">
          The six verdicts
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
          {VERDICTS.map((v) => (
            <div key={v.name} className="border border-border rounded-lg px-4 py-3">
              <p className="text-[13px] font-medium text-text mb-0.5">{v.name}</p>
              <p className="text-[11px] text-muted leading-[1.5]">{v.when}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Honest box */}
      <div className="border-l-2 border-border-secondary pl-4 rounded-none">
        <p className="text-[13px] text-text-65 leading-[1.65]">
          Electoral timing doesn&apos;t tank the score. A scheme can earn &ldquo;Works despite
          itself&rdquo; — which means the scheme changed lives even if the design was visibility-optimised.
          The DMK knew when to give out TVs. The TVs still ended something real.
        </p>
        <p className="text-[13px] text-text-65 leading-[1.65] mt-2.5">
          We also ask what the numbers miss in every analysis. Every scheme has something that
          doesn&apos;t show up here. We say so.
        </p>
      </div>

      {/* Back */}
      <button
        onClick={onBack}
        className="mt-8 px-6 py-3 bg-accent text-bg font-body font-semibold text-[13px]
          rounded-md cursor-pointer hover:opacity-85 transition-opacity"
      >
        Back to result
      </button>
    </motion.div>
  );
}
