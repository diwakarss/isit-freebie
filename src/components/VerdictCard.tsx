"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { AnalysisResult } from "@/types";
import HowWeScore from "./HowWeScore";

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const motionVal = useMotionValue(0);
  const display = useTransform(motionVal, (v) => Math.round(v));
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: duration / 1000,
      ease: "easeOut",
    });
    const unsub = display.on("change", (v) => setCurrent(v));
    return () => { controls.stop(); unsub(); };
  }, [value, duration, motionVal, display]);

  return <>{current}</>;
}

function AnimatedBar({ width, color, delay }: { width: number; color: string; delay: number }) {
  return (
    <motion.div
      className="h-full rounded-sm"
      style={{ backgroundColor: color }}
      initial={{ width: "0%" }}
      animate={{ width: `${width}%` }}
      transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
    />
  );
}

const LAYER_COLORS: Record<string, string> = {
  POLICY: "#4a9eff",
  HIDDEN: "#a78bfa",
  DIGNITY: "#fb923c",
};

const LAYER_LABELS: Record<string, string> = {
  POLICY: "Policy",
  HIDDEN: "Hidden cost",
  DIGNITY: "Dignity",
};

interface VerdictCardProps {
  result: AnalysisResult;
  schemeName: string;
  onTryAnother: () => void;
  onShare: () => void;
}

export default function VerdictCard({ result, schemeName, onTryAnother, onShare }: VerdictCardProps) {
  const [showMethodology, setShowMethodology] = useState(false);
  const [copied, setCopied] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  const handleCopyShare = () => {
    navigator.clipboard.writeText(result.shareLine || "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (showMethodology) {
    return <HowWeScore onBack={() => setShowMethodology(false)} />;
  }

  return (
    <div ref={pageRef} className="max-w-[520px] mx-auto px-0 pb-16" style={{ fontFamily: "var(--font-result-body)" }}>
      {/* VERDICT HERO */}
      <motion.div
        className="pt-10 pb-8 border-b border-border"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-muted mb-5">
          {schemeName}
        </p>
        <h1
          className="font-black leading-[1.05] tracking-[-0.02em] mb-4"
          style={{
            fontSize: "clamp(38px, 9vw, 56px)",
            color: result.verdictColor,
            fontFamily: "var(--font-result-display)",
          }}
        >
          {result.verdict}.
        </h1>
        <p className="text-[15px] leading-[1.7] text-text-80">
          {result.oneLine}
        </p>
      </motion.div>

      {/* SCORE BLOCK */}
      <motion.div
        className="py-7 border-b border-border flex items-center gap-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.12 }}
      >
        <div className="shrink-0">
          <span className="font-black text-[72px] leading-none tracking-[-0.03em] text-accent min-w-[100px] inline-block" style={{ fontFamily: "var(--font-result-display)" }}>
            <AnimatedNumber value={result.wsdScore} />
          </span>
          <span className="text-[20px] text-muted font-normal">/100</span>
        </div>
        <div className="flex-1">
          <p className="text-[13px] text-muted leading-[1.65] mb-3.5">
            Geometric mean of three layers — not an average. A weak layer still drags the score down.
          </p>
          <div className="flex flex-col gap-2">
            {result.layers?.map((layer, i) => (
              <div key={layer.name} className="flex items-center gap-2.5">
                <span className="text-[11px] text-muted min-w-[80px]">
                  {LAYER_LABELS[layer.name] || layer.name}
                </span>
                <div className="flex-1 h-[3px] bg-border rounded-sm overflow-hidden">
                  <AnimatedBar
                    width={layer.score}
                    color={LAYER_COLORS[layer.name] || "#888"}
                    delay={0.3 + i * 0.08}
                  />
                </div>
                <span className="text-[11px] font-semibold text-text min-w-[24px] text-right">
                  {layer.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* HIDDEN COST */}
      <motion.div
        className="py-7 border-b border-border"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.16 }}
      >
        <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted mb-2.5">
          The cost this scheme ended
        </p>
        <h2 className="font-bold text-[18px] leading-[1.25] mb-2.5" style={{ fontFamily: "var(--font-result-display)" }}>
          {result.hiddenCostHeadline}
        </h2>
        <p className="text-[13px] leading-[1.75] text-text-65">
          {result.hiddenCost}
        </p>
      </motion.div>

      {/* WHAT THE NUMBERS MISS */}
      <motion.div
        className="py-7 border-b border-border"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted mb-2.5">
          What no score can capture
        </p>
        <p className="text-[13px] leading-[1.75] text-text-50 italic pl-4 border-l-2 border-border-secondary">
          {result.whatNumbersMiss}
        </p>
      </motion.div>

      {/* DESIGN INTEGRITY */}
      <motion.div
        className="py-7 border-b border-border"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.24 }}
      >
        <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted mb-2.5">
          Design integrity
        </p>
        <div className="flex items-center gap-3 my-2.5">
          <div className="flex-1 h-1 bg-border rounded-sm overflow-hidden">
            <AnimatedBar
              width={result.designIntegrity}
              color={result.designIntegrity >= 60 ? "#22C55E" : result.designIntegrity >= 35 ? "#F59E0B" : "#ef4444"}
              delay={0.5}
            />
          </div>
          <div className="min-w-[36px] text-right">
            <span className="text-[14px] font-semibold" style={{ color: result.designIntegrity >= 60 ? "#22C55E" : result.designIntegrity >= 35 ? "#F59E0B" : "#ef4444" }}>
              {result.designIntegrity}
            </span>
            <span className="text-[10px] font-normal text-muted">/100</span>
          </div>
        </div>
        <p className="text-[12px] text-muted leading-[1.6]">
          {result.designIntegrityNote}
        </p>
      </motion.div>

      {/* FLAGS — cascade beneficiary + gender */}
      {(result.cascadeBeneficiary || result.genderFlag) && (
        <motion.div
          className="py-7 border-b border-border"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.26 }}
        >
          {result.cascadeBeneficiary && (
            <div className="mb-3">
              <span className="inline-block text-[10px] font-semibold tracking-[0.1em] uppercase text-[#a78bfa] bg-[#a78bfa]/10 px-2 py-0.5 rounded mr-2">
                Cascade
              </span>
              <span className="text-[13px] text-text-65">{result.cascadeBeneficiary}</span>
            </div>
          )}
          {result.genderFlag && (
            <div>
              <span className="inline-block text-[10px] font-semibold tracking-[0.1em] uppercase text-[#fb923c] bg-[#fb923c]/10 px-2 py-0.5 rounded mr-2">
                Gender
              </span>
              <span className="text-[13px] text-text-65">{result.genderFlag}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* SHARE */}
      <motion.div
        className="pt-7"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.28 }}
      >
        <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted mb-2.5">
          Share this
        </p>
        <div className="text-[13px] leading-[1.7] text-text bg-surface border border-border rounded-lg p-3.5 mb-3.5">
          {result.shareLine}
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleCopyShare}
            className="inline-flex items-center gap-1.5 bg-accent text-bg text-[13px] font-semibold
              px-4 py-2.5 rounded-md border-none cursor-pointer hover:opacity-85 transition-opacity"
          >
            {copied ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                Copied
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Copy &amp; share
              </>
            )}
          </button>
          <button
            onClick={() => setShowMethodology(true)}
            className="text-[12px] text-muted cursor-pointer bg-transparent border-0 border-b border-border-secondary
              pb-px hover:text-text transition-colors font-body"
          >
            How is this calculated?
          </button>
        </div>
      </motion.div>

      {/* TRY ANOTHER — kept from current design */}
      <motion.div
        className="mt-10 flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <button
          onClick={onTryAnother}
          className="px-10 py-4 bg-accent text-bg font-body font-semibold text-sm uppercase tracking-wider
            hover:opacity-85 transition-opacity cursor-pointer"
          style={{ clipPath: "polygon(2% 0%, 100% 3%, 97% 100%, 0% 96%)" }}
        >
          Try Another Scheme
        </button>
      </motion.div>

      {/* Footer */}
      <p className="text-[10px] text-white/[0.12] tracking-[0.1em] uppercase text-center pt-6">
        isitafreebie.com · WSD v1.2
      </p>
    </div>
  );
}
