"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import InputSection from "@/components/InputSection";
import AnalyzeAnimation from "@/components/AnalyzeAnimation";
import VerdictCard from "@/components/VerdictCard";
import type { AnalysisResult, AppState } from "@/types";

// Cloudflare Turnstile — invisible challenge
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAACve0rOm6EAt0wdd";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

function getTurnstileToken(): Promise<string> {
  return new Promise((resolve) => {
    if (!window.turnstile) {
      resolve(""); // Turnstile not loaded, skip (dev mode)
      return;
    }

    // Timeout: if Turnstile doesn't respond in 10s, proceed without token
    const timeout = setTimeout(() => {
      try { window.turnstile?.remove(widgetId); } catch {}
      container.remove();
      resolve("");
    }, 10_000);

    const container = document.createElement("div");
    container.style.display = "none";
    document.body.appendChild(container);

    const widgetId = window.turnstile.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token: string) => {
        clearTimeout(timeout);
        window.turnstile?.remove(widgetId);
        container.remove();
        resolve(token);
      },
      "error-callback": () => {
        clearTimeout(timeout);
        container.remove();
        resolve(""); // Graceful degradation — don't block the user
      },
      "expired-callback": () => {
        clearTimeout(timeout);
        container.remove();
        resolve("");
      },
      size: "invisible",
    });
  });
}

function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return prefersReduced;
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-accent text-bg rounded-lg font-body text-sm font-medium shadow-lg z-50"
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
    >
      {message}
    </motion.div>
  );
}

export default function Home() {
  const [scheme, setScheme] = useState("");
  const [state, setState] = useState<AppState>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [toast, setToast] = useState("");
  const [showThinking, setShowThinking] = useState(false);
  const prefersReduced = usePrefersReducedMotion();
  const topRef = useRef<HTMLDivElement>(null);
  const animStartRef = useRef<number>(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (state === "result" || state === "not-a-scheme" || state === "error")) {
        handleReset();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state]);

  const analyzeScheme = useCallback(async (schemeText: string) => {
    if (!schemeText.trim()) return;

    setState("analyzing");
    setShowThinking(false);
    animStartRef.current = Date.now();

    const MINIMUM_ANIMATION_MS = prefersReduced ? 0 : 3500;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_ANALYZE_URL || "/api/analyze";
      const turnstileToken = await getTurnstileToken().catch(() => "");
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheme: schemeText.trim(), turnstileToken }),
        signal: AbortSignal.timeout(120_000),
      });

      const elapsed = Date.now() - animStartRef.current;
      if (elapsed < MINIMUM_ANIMATION_MS) {
        setShowThinking(true);
        await new Promise((r) => setTimeout(r, MINIMUM_ANIMATION_MS - elapsed));
      }

      if (response.status === 429) {
        setState("rate-limited");
        return;
      }

      if (!response.ok) {
        setState("error");
        return;
      }

      // Streaming response: strip heartbeat newlines, parse trailing JSON
      const raw = await response.text();
      const data: AnalysisResult = JSON.parse(raw.trim());

      if (data.verdict === "Not a Scheme") {
        setResult(data);
        setState("not-a-scheme");
      } else {
        setResult(data);
        setState("result");
      }
    } catch {
      const elapsed = Date.now() - animStartRef.current;
      if (elapsed < MINIMUM_ANIMATION_MS) {
        await new Promise((r) => setTimeout(r, MINIMUM_ANIMATION_MS - elapsed));
      }
      setState("error");
    }
  }, [prefersReduced]);

  const handleAnalyze = useCallback(() => {
    analyzeScheme(scheme);
  }, [scheme, analyzeScheme]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setScheme(suggestion);
    analyzeScheme(suggestion);
  }, [analyzeScheme]);

  const handleReset = useCallback(() => {
    setState("idle");
    setResult(null);
    setScheme("");
    setShowThinking(false);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleShare = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result.shareLine || "").then(() => setToast("Share text copied!"));
  }, [result]);

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12 sm:py-16">
      <div ref={topRef} className="w-full max-w-[640px] mx-auto">
        <AnimatePresence mode="wait">
          {/* IDLE STATE */}
          {state === "idle" && (
            <motion.div
              key="idle"
              className="min-h-[80vh] flex flex-col items-center justify-center space-y-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center space-y-4">
                <h1 className="text-5xl sm:text-7xl md:text-8xl font-display text-white leading-[0.9] tracking-tight">
                  IS IT A<br />FREEBIE?
                </h1>
                <p className="text-sm sm:text-base font-body font-medium text-muted max-w-sm mx-auto tracking-wide uppercase">
                  Type any government scheme. We&apos;ll tell you if it&apos;s welfare or a vote grab.
                </p>
              </div>

              <InputSection
                value={scheme}
                onChange={setScheme}
                onAnalyze={handleAnalyze}
                onSuggestionClick={handleSuggestionClick}
                disabled={false}
                isAnalyzing={false}
              />
            </motion.div>
          )}

          {/* ANALYZING STATE */}
          {state === "analyzing" && (
            <motion.div
              key="analyzing"
              className="min-h-[80vh] flex flex-col items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {prefersReduced ? (
                <div className="text-center py-12">
                  <p className="font-body text-muted">Analyzing...</p>
                </div>
              ) : (
                <AnalyzeAnimation showThinking={showThinking} />
              )}
            </motion.div>
          )}

          {/* RESULT STATE */}
          {state === "result" && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <VerdictCard
                result={result}
                schemeName={scheme}
                onTryAnother={handleReset}
                onShare={handleShare}
              />
            </motion.div>
          )}

          {/* NOT A SCHEME STATE */}
          {state === "not-a-scheme" && result && (
            <motion.div
              key="not-a-scheme"
              className="min-h-[80vh] flex flex-col items-center justify-center text-center space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-3xl sm:text-4xl font-display text-white">
                Not a Scheme
              </h2>
              <p className="text-sm font-body text-muted max-w-md mx-auto">
                That doesn&apos;t look like a government scheme. Try entering a real policy name.
              </p>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-accent text-bg font-body font-medium text-sm uppercase tracking-wider
                  hover:bg-amber-400 transition-colors"
                style={{ clipPath: "polygon(1% 0%, 100% 2%, 99% 100%, 0% 97%)" }}
              >
                Try a Real Scheme
              </button>
            </motion.div>
          )}

          {/* ERROR STATE */}
          {state === "error" && (
            <motion.div
              key="error"
              className="min-h-[80vh] flex flex-col items-center justify-center text-center space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-3xl sm:text-4xl font-display text-white">
                The Bureaucracy is Overwhelmed
              </h2>
              <p className="text-sm font-body text-muted">
                Your request got lost in the paperwork. Try again?
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleAnalyze}
                  className="px-6 py-3 bg-accent text-bg font-body font-medium text-sm uppercase tracking-wider
                    hover:bg-amber-400 transition-colors"
                  style={{ clipPath: "polygon(1% 0%, 100% 2%, 99% 100%, 0% 97%)" }}
                >
                  Try Again
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 border border-dashed border-border text-white font-body font-medium text-sm uppercase tracking-wider
                    hover:border-accent transition-colors"
                >
                  Start Over
                </button>
              </div>
            </motion.div>
          )}

          {/* RATE LIMITED STATE */}
          {state === "rate-limited" && (
            <motion.div
              key="rate-limited"
              className="min-h-[80vh] flex flex-col items-center justify-center text-center space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-3xl sm:text-4xl font-display text-white">
                Too Many RTIs Filed
              </h2>
              <p className="text-sm font-body text-muted">
                You&apos;ve overwhelmed the system. Wait a moment and try again.
              </p>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-accent text-bg font-body font-medium text-sm uppercase tracking-wider
                  hover:bg-amber-400 transition-colors"
                style={{ clipPath: "polygon(1% 0%, 100% 2%, 99% 100%, 0% 97%)" }}
              >
                Start Over
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast("")} />}
      </AnimatePresence>
    </main>
  );
}
