"use client";

import { motion } from "framer-motion";

interface ScoreBarProps {
  name: string;
  score: number;
  reasoning: string;
  color: string;
  delay?: number;
}

export default function ScoreBar({ name, score, reasoning, color, delay = 0 }: ScoreBarProps) {
  const fillPercent = Math.max(0, Math.min(100, (score / 10) * 100));

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
    >
      {/* Label row */}
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-body font-semibold text-white uppercase tracking-wider">{name}</span>
        <span
          className="text-lg font-display tabular-nums"
          style={{ color }}
        >
          {score}/10
        </span>
      </div>

      {/* Bar — thicker, with stamp-edge aesthetic */}
      <div className="h-3 bg-border/50 overflow-hidden" style={{ clipPath: "polygon(0% 0%, 100% 5%, 100% 95%, 0% 100%)" }}>
        <motion.div
          className="h-full"
          style={{ backgroundColor: color }}
          initial={{ width: "0%" }}
          whileInView={{ width: `${fillPercent}%` }}
          viewport={{ once: true }}
          transition={{ delay: delay + 0.2, duration: 0.6, ease: "easeOut" }}
          role="meter"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={10}
          aria-label={`${name} score`}
        />
      </div>

      {/* Reasoning */}
      {reasoning && (
        <motion.p
          className="text-xs font-body text-muted leading-relaxed pl-0.5"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: delay + 0.5, duration: 0.3 }}
        >
          {reasoning}
        </motion.p>
      )}
    </motion.div>
  );
}
