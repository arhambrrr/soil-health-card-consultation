"use client";

import { useEffect, useState } from "react";
import type { Translations } from "@/lib/i18n";

const STEP_DURATIONS = [2000, 4000]; // Step 2 stays active (pulsing) until navigation unmounts it

interface Props {
  visible: boolean;
  error?: string | null;
  onRetry?: () => void;
  t?: Translations;
}

export default function ExtractionProgress({ visible, error, onRetry, t }: Props) {
  const [step, setStep] = useState(0);

  const stepLabels = [
    t?.readingCard          ?? "Reading card...",
    t?.extractingData       ?? "Extracting data...",
    t?.preparingConsultation ?? "Preparing consultation...",
  ];

  useEffect(() => {
    if (!visible || error) return;
    setStep(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    STEP_DURATIONS.forEach((dur, i) => {
      elapsed += dur;
      timers.push(setTimeout(() => setStep(i + 1), elapsed));
    });
    return () => timers.forEach(clearTimeout);
  }, [visible, error]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 w-96 border border-neutral-200">
        {error ? (
          <div className="text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <p className="font-semibold text-neutral-900">{t?.extractionFailed ?? "Extraction failed"}</p>
            <p className="text-sm text-neutral-500">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 px-6 py-2.5 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-900"
              >
                {t?.tryAgain ?? "Try again"}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-center font-semibold text-neutral-900 mb-6">
              {t?.processingCard ?? "Processing Soil Health Card"}
            </p>
            {stepLabels.map((label, i) => {
              const done   = step > i;
              const active = step === i;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 border ${
                      done
                        ? "bg-neutral-900 border-neutral-900"
                        : active
                        ? "bg-white border-2 border-neutral-900 animate-pulse"
                        : "bg-white border-neutral-300"
                    }`}
                  >
                    {done && (
                      <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      done ? "text-neutral-400 line-through" : active ? "text-neutral-900 font-medium" : "text-neutral-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
