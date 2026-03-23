"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const BUREAUCRATIC_PHRASES = [
  "FILING PAPERWORK",
  "CONSULTING BABUS",
  "CHECKING RECORDS",
  "REVIEWING BUDGET",
  "STAMPING FILES",
  "ASSESSING SCHEME",
];

interface AnalyzeAnimationProps {
  showThinking: boolean;
}

export default function AnalyzeAnimation({ showThinking }: AnalyzeAnimationProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % BUREAUCRATIC_PHRASES.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-8">
      {/* Stamp press animation */}
      <div className="relative w-40 h-40 sm:w-48 sm:h-48">
        {/* Shadow on the "desk" */}
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-3 rounded-full bg-accent/20 blur-md"
          animate={{ scaleX: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Stamp coming down and pressing */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            y: [0, 20, 0],
            scale: [1, 0.92, 1],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: [0.45, 0, 0.55, 1],
          }}
        >
          <div
            className="px-6 py-4 border-[3px] border-accent font-display text-accent text-lg sm:text-xl tracking-wider"
            style={{
              backgroundColor: "rgba(245, 158, 11, 0.08)",
              clipPath: "polygon(2% 0%, 100% 3%, 97% 100%, 0% 96%)",
            }}
          >
            ANALYZING
          </div>
        </motion.div>

        {/* Ink splatter particles on each stamp press */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-accent/40"
            style={{
              left: `${30 + i * 15}%`,
              bottom: "20%",
            }}
            animate={{
              y: [0, -15 - i * 5, 0],
              x: [0, (i % 2 === 0 ? 1 : -1) * (8 + i * 3), 0],
              opacity: [0, 0.8, 0],
              scale: [0.5, 1.2, 0.5],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: 0.6,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* Cycling bureaucratic phrases */}
      <div className="h-8 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={phraseIndex}
            className="font-body font-semibold text-sm text-muted tracking-[0.2em] uppercase text-center"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {BUREAUCRATIC_PHRASES[phraseIndex]}...
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      {showThinking && (
        <motion.div
          className="flex gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-accent"
              style={{ clipPath: "polygon(10% 0%, 100% 5%, 90% 100%, 0% 95%)" }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
