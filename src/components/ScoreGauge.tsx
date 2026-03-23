"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

const SEGMENTS = [
  { max: 40, color: "#EF4444" },   // Electoral candy / Well-meaning dud
  { max: 65, color: "#F59E0B" },   // Looks good on paper
  { max: 100, color: "#22C55E" },  // Genuine uplift / Real impact
];

const START_ANGLE = 150; // degrees (bottom-left)
const END_ANGLE = 390; // degrees (bottom-right, wrapping around)
const SWEEP = END_ANGLE - START_ANGLE; // 240 degrees

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function scoreToAngle(score: number) {
  return START_ANGLE + (score / 100) * SWEEP;
}

interface ScoreGaugeProps {
  score: number;
  color: string;
  animate?: boolean;
}

export default function ScoreGauge({ score, color, animate: shouldAnimate = true }: ScoreGaugeProps) {
  const cx = 150;
  const cy = 150;
  const outerR = 120;
  const innerR = 100;
  const tickR = 125;
  const needleR = 95;

  const motionScore = useMotionValue(0);
  const displayScore = useTransform(motionScore, (v) => Math.round(v));

  useEffect(() => {
    if (shouldAnimate) {
      animate(motionScore, score, { duration: 1.2, ease: "easeOut" });
    } else {
      motionScore.set(score);
    }
  }, [score, shouldAnimate, motionScore]);

  // Draw segment arcs
  const segmentArcs = SEGMENTS.map((seg, i) => {
    const segStart = i === 0 ? 0 : SEGMENTS[i - 1].max;
    const startA = scoreToAngle(segStart);
    const endA = scoreToAngle(seg.max);
    return (
      <path
        key={i}
        d={describeArc(cx, cy, outerR, startA, endA)}
        fill="none"
        stroke={seg.color}
        strokeWidth={8}
        strokeLinecap="round"
        opacity={0.3}
      />
    );
  });

  // Active arc (filled portion)
  const activeEndAngle = scoreToAngle(score);
  const activeSegments = SEGMENTS.map((seg, i) => {
    const segStart = i === 0 ? 0 : SEGMENTS[i - 1].max;
    if (score <= segStart) return null;
    const segEnd = Math.min(score, seg.max);
    const startA = scoreToAngle(segStart);
    const endA = scoreToAngle(segEnd);
    return (
      <motion.path
        key={`active-${i}`}
        d={describeArc(cx, cy, outerR, startA, endA)}
        fill="none"
        stroke={seg.color}
        strokeWidth={8}
        strokeLinecap="round"
        initial={shouldAnimate ? { pathLength: 0 } : undefined}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    );
  });

  // Tick marks
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const angle = scoreToAngle(i * 10);
    const outer = polarToCartesian(cx, cy, tickR, angle);
    const inner = polarToCartesian(cx, cy, outerR + 2, angle);
    return (
      <line
        key={i}
        x1={outer.x}
        y1={outer.y}
        x2={inner.x}
        y2={inner.y}
        stroke="#A1A1AA"
        strokeWidth={i % 5 === 0 ? 2 : 1}
        opacity={0.4}
      />
    );
  });

  // Needle
  const needleTip = polarToCartesian(cx, cy, needleR, activeEndAngle);

  return (
    <div className="flex justify-center">
      <svg
        viewBox="0 0 300 240"
        className="w-[280px] sm:w-[360px] md:w-[400px]"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`WSD score: ${score} out of 100`}
      >
        {/* Background track */}
        <path
          d={describeArc(cx, cy, outerR, START_ANGLE, END_ANGLE)}
          fill="none"
          stroke="#27272A"
          strokeWidth={8}
          strokeLinecap="round"
        />

        {/* Segment arcs (dimmed) */}
        {segmentArcs}

        {/* Active arcs (bright) */}
        {activeSegments}

        {/* Tick marks */}
        {ticks}

        {/* Needle */}
        <motion.line
          x1={cx}
          y1={cy}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          initial={shouldAnimate ? {
            x2: polarToCartesian(cx, cy, needleR, START_ANGLE).x,
            y2: polarToCartesian(cx, cy, needleR, START_ANGLE).y,
          } : undefined}
          animate={{
            x2: needleTip.x,
            y2: needleTip.y,
          }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={4} fill={color} />

        {/* Score number */}
        <motion.text
          x={cx}
          y={cy - 15}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontFamily="'Anton', sans-serif"
          fontWeight="400"
          fontSize="52"
        >
          {displayScore}
        </motion.text>

        {/* "WSD Score" label */}
        <text
          x={cx}
          y={cy + 20}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#A1A1AA"
          fontFamily="'Epilogue', sans-serif"
          fontWeight="500"
          fontSize="11"
          style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
        >
          WSD SCORE
        </text>

        {/* Scale labels */}
        <text
          x={polarToCartesian(cx, cy, outerR + 18, START_ANGLE).x}
          y={polarToCartesian(cx, cy, outerR + 18, START_ANGLE).y}
          textAnchor="middle"
          fill="#EF4444"
          fontFamily="'Anton', sans-serif"
          fontSize="11"
          fontWeight="400"
          letterSpacing="0.05em"
        >
          DUD
        </text>
        <text
          x={polarToCartesian(cx, cy, outerR + 18, END_ANGLE).x}
          y={polarToCartesian(cx, cy, outerR + 18, END_ANGLE).y}
          textAnchor="middle"
          fill="#22C55E"
          fontFamily="'Anton', sans-serif"
          fontSize="11"
          fontWeight="400"
          letterSpacing="0.05em"
        >
          UPLIFT
        </text>
      </svg>
    </div>
  );
}
