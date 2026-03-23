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
      {/* FREEBIE ANSWER — the direct answer */}
      <motion.div
        className="pt-10 pb-6 border-b border-border"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-[13px] font-semibold tracking-[0.14em] uppercase text-muted mb-3">
          {schemeName}
        </p>
        <p className="text-[15px] text-muted mb-2" style={{ fontFamily: "var(--font-result-body)" }}>
          Is it a freebie?
        </p>
        <h1
          className="font-black leading-[1] tracking-[-0.02em] mb-3"
          style={{
            fontSize: "clamp(48px, 12vw, 72px)",
            color: result.freebieAnswer === "No" ? "#22C55E" : result.freebieAnswer === "Yes" ? "#EF4444" : "#F59E0B",
            fontFamily: "var(--font-result-display)",
          }}
        >
          {result.freebieAnswer}.
        </h1>
        <p className="text-[16px] leading-[1.5] text-text-65 mb-5">
          {result.freebieShort}
        </p>
        <div className="flex items-center gap-3">
          <span
            className="text-[14px] font-semibold px-2.5 py-1 rounded"
            style={{
              color: result.verdictColor,
              backgroundColor: `${result.verdictColor}15`,
            }}
          >
            {result.verdict}
          </span>
          <span className="text-[15px] text-text-50">
            {result.oneLine}
          </span>
        </div>
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
          <span className="text-[22px] text-muted font-normal">/100</span>
        </div>
        <div className="flex-1">
          <p className="text-[13px] text-muted leading-[1.5] mb-3">
            Geometric mean — a weak layer drags the score down.
          </p>
          <div className="flex flex-col gap-2.5">
            {result.layers?.map((layer, i) => (
              <div key={layer.name} className="flex items-center gap-2.5">
                <span className="text-[13px] text-muted min-w-[85px]">
                  {LAYER_LABELS[layer.name] || layer.name}
                </span>
                <div className="flex-1 h-[4px] bg-border rounded-sm overflow-hidden">
                  <AnimatedBar
                    width={layer.score}
                    color={LAYER_COLORS[layer.name] || "#888"}
                    delay={0.3 + i * 0.08}
                  />
                </div>
                <span className="text-[13px] font-semibold text-text min-w-[26px] text-right">
                  {layer.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* HIDDEN COST */}
      <motion.div
        className="py-6 border-b border-border"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.16 }}
      >
        <p className="text-[12px] font-semibold tracking-[0.16em] uppercase text-muted mb-2">
          Before this scheme
        </p>
        <h2 className="font-bold text-[19px] leading-[1.25] mb-2.5" style={{ fontFamily: "var(--font-result-display)" }}>
          {result.hiddenCostHeadline}
        </h2>
        <p className="text-[15px] leading-[1.7] text-text-65">
          {result.hiddenCost}
        </p>
      </motion.div>

      {/* WHAT THE NUMBERS MISS */}
      <motion.div
        className="py-6 border-b border-border"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <p className="text-[14px] leading-[1.65] text-text-50 italic pl-4 border-l-2 border-border-secondary">
          {result.whatNumbersMiss}
        </p>
      </motion.div>

      {/* DESIGN INTEGRITY */}
      <motion.div
        className="py-6 border-b border-border"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.24 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <p className="text-[12px] font-semibold tracking-[0.16em] uppercase text-muted">
            Design integrity
          </p>
          <span className="text-[15px] font-semibold" style={{ color: result.designIntegrity >= 60 ? "#22C55E" : result.designIntegrity >= 35 ? "#F59E0B" : "#ef4444" }}>
            {result.designIntegrity}
          </span>
        </div>
        <p className="text-[14px] text-muted leading-[1.6]">
          {result.designIntegrityNote}
        </p>
      </motion.div>

      {/* FLAGS — cascade beneficiary + gender */}
      {(result.cascadeBeneficiary || result.genderFlag) && (
        <motion.div
          className="py-5 border-b border-border flex flex-wrap gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.26 }}
        >
          {result.cascadeBeneficiary && (
            <span className="text-[13px] text-[#a78bfa] bg-[#a78bfa]/10 px-3 py-1.5 rounded">
              {result.cascadeBeneficiary}
            </span>
          )}
          {result.genderFlag && (
            <span className="text-[13px] text-[#fb923c] bg-[#fb923c]/10 px-3 py-1.5 rounded">
              {result.genderFlag}
            </span>
          )}
        </motion.div>
      )}

      {/* SHARE */}
      <motion.div
        className="pt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.28 }}
      >
        <div className="text-[14px] leading-[1.6] text-text-80 bg-surface border border-border rounded-lg p-3.5 mb-3.5">
          {result.shareLine}
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleCopyShare}
            className="inline-flex items-center gap-1.5 bg-accent text-bg text-[14px] font-semibold
              px-4 py-2.5 rounded-md border-none cursor-pointer hover:opacity-85 transition-opacity"
          >
            {copied ? "Copied" : "Copy & share"}
          </button>
          <button
            onClick={() => setShowMethodology(true)}
            className="text-[13px] text-muted cursor-pointer bg-transparent border-0 border-b border-border-secondary
              pb-px hover:text-text transition-colors font-body"
          >
            How is this scored?
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
          className="px-10 py-4 bg-accent text-bg font-body font-semibold text-base uppercase tracking-wider
            hover:opacity-85 transition-opacity cursor-pointer"
          style={{ clipPath: "polygon(2% 0%, 100% 3%, 97% 100%, 0% 96%)" }}
        >
          Try Another Scheme
        </button>
      </motion.div>

      {/* Footer */}
      <p className="text-[11px] text-white/[0.12] tracking-[0.1em] uppercase text-center pt-6">
        isitafreebie.com · WSD v1.3
      </p>
    </div>
  );
}
