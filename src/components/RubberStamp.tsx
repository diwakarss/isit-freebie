"use client";

import { motion } from "framer-motion";

interface RubberStampProps {
  verdict: string;
  color: string;
  animate?: boolean;
}

export default function RubberStamp({ verdict, color, animate: shouldAnimate = true }: RubberStampProps) {
  return (
    <div className="flex justify-center" aria-hidden="true">
      <motion.div
        className="inline-block px-8 sm:px-10 py-3 sm:py-4 font-display
          text-xl sm:text-2xl md:text-3xl tracking-wider"
        style={{
          color,
          border: `3px solid ${color}`,
          backgroundColor: `${color}14`,
          rotate: "-3deg",
        }}
        initial={shouldAnimate ? {
          scale: 0,
          rotate: -15,
          opacity: 0,
        } : undefined}
        animate={{
          scale: 1,
          rotate: -3,
          opacity: 1,
        }}
        transition={shouldAnimate ? {
          type: "spring",
          stiffness: 300,
          damping: 15,
          duration: 0.4,
        } : { duration: 0 }}
      >
        {/* Stamp ink shadow appears after landing */}
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{
            boxShadow: `3px 3px 0 ${color}26`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: shouldAnimate ? 0.4 : 0, duration: 0.2 }}
        />
        {verdict}
      </motion.div>
    </div>
  );
}
