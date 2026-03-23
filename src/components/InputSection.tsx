"use client";

import { motion } from "framer-motion";

const SUGGESTIONS = [
  "PM-KISAN",
  "Free Laptop Scheme",
  "Farm Loan Waiver",
  "TN Breakfast Scheme",
  "Free Bus for Women",
  "Ujjwala Yojana",
];

interface InputSectionProps {
  value: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  onSuggestionClick: (suggestion: string) => void;
  disabled: boolean;
  isAnalyzing: boolean;
}

export default function InputSection({ value, onChange, onAnalyze, onSuggestionClick, disabled, isAnalyzing }: InputSectionProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim() && !disabled) {
      onAnalyze();
    }
  };

  const isActive = value.trim() && !disabled;

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* Input — bottom-border emphasis */}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a government scheme..."
          maxLength={300}
          disabled={isAnalyzing}
          className="w-full px-2 py-4 bg-transparent border-0 border-b-3 border-border text-white font-body text-lg font-medium tracking-wide
            placeholder:text-muted/60 focus:outline-none focus:border-accent transition-colors
            disabled:opacity-50 uppercase"
          style={{ boxShadow: "none" }}
          aria-label="Government scheme to analyze"
        />
        {value.length > 250 && (
          <span className="absolute right-3 bottom-1 text-xs text-muted">
            {value.length}/300
          </span>
        )}
      </div>

      {/* Suggestion chips — dashed file label tabs */}
      <div className="flex flex-wrap gap-2 justify-center">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            disabled={isAnalyzing}
            className={`px-4 py-2 text-xs sm:text-sm font-body font-semibold tracking-wider uppercase
              border-2 min-h-[44px] transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              ${value === suggestion
                ? "border-solid border-accent text-accent bg-accent/10"
                : "border-dashed border-border text-muted hover:border-accent hover:text-accent hover:bg-accent/5"
              }`}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Analyze button — bold stamp block */}
      <div className="flex justify-center pt-6">
        <motion.button
          onClick={onAnalyze}
          disabled={!value.trim() || disabled}
          className={`relative px-10 py-5 sm:px-12 sm:py-6
            font-display text-2xl sm:text-3xl tracking-wider
            focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg
            transition-all duration-150
            ${isActive
              ? "text-bg cursor-pointer bg-accent"
              : "text-muted cursor-not-allowed border-2 border-border bg-transparent"
            }`}
          style={isActive ? {
            clipPath: "polygon(2% 0%, 100% 3%, 97% 100%, 0% 96%)",
            boxShadow: "0 6px 20px rgba(245,158,11,0.4), 0 2px 8px rgba(0,0,0,0.5)",
          } : {
            clipPath: "polygon(2% 0%, 100% 3%, 97% 100%, 0% 96%)",
          }}
          whileHover={isActive ? {
            scale: 1.05,
            boxShadow: "0 8px 30px rgba(245,158,11,0.5), 0 4px 12px rgba(0,0,0,0.5)",
          } : undefined}
          whileTap={isActive ? {
            scale: 0.95,
            boxShadow: "0 2px 8px rgba(245,158,11,0.3), 0 1px 4px rgba(0,0,0,0.3)",
          } : undefined}
          aria-label="Analyze scheme"
        >
          IS IT A FREEBIE?
        </motion.button>
      </div>
    </div>
  );
}
