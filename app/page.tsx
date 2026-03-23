"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getTranslations, LANG_OPTIONS, type LangKey } from "@/lib/i18n";
import LanguagePicker from "@/components/LanguagePicker";
import IntakeForm from "@/components/IntakeForm";
import ExtractionProgress from "@/components/ExtractionProgress";

export default function HomePage() {
  const router = useRouter();
  const [langKey, setLangKey] = useState<LangKey | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingForm, setPendingForm] = useState<FormData | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setOverlayVisible(true);
    setLoading(true);
    setError(null);
    setPendingForm(formData);

    try {
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok || !data.sessionId) {
        throw new Error(data.error ?? "Extraction failed. Please try again.");
      }

      // Store context client-side — Vercel serverless Lambdas don't share memory
      sessionStorage.setItem(`shc-session-${data.sessionId}`, JSON.stringify({
        context: data.context,
        openingText: data.openingText,
      }));
      const stateParam = encodeURIComponent(formData.get("state") as string ?? "");
      const langParam  = langKey ? `&lang=${encodeURIComponent(langKey)}` : "";
      router.push(`/session/${data.sessionId}?state=${stateParam}${langParam}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setOverlayVisible(false);
    if (pendingForm) handleSubmit(pendingForm);
  };

  // ── Step 1: language picker ────────────────────────────────────────────────
  if (!langKey) {
    return <LanguagePicker onSelect={setLangKey} />;
  }

  // ── Step 2: intake form in the chosen language ─────────────────────────────
  const t = getTranslations(langKey);
  const opt = LANG_OPTIONS.find((o) => o.key === langKey)!;

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-2xl mb-4">🌱</div>
          <h1 className="text-2xl font-bold text-neutral-900">{t.appTitle}</h1>
          <p className="text-neutral-500 text-sm mt-1">{t.appSubtitle}</p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <IntakeForm
            langKey={langKey}
            langOption={opt}
            t={t}
            onSubmit={handleSubmit}
            loading={overlayVisible}
            onChangeLanguage={() => setLangKey(null)}
          />
        </div>
      </div>

      <ExtractionProgress
        visible={overlayVisible}
        error={error}
        onRetry={handleRetry}
        t={t}
      />
    </main>
  );
}
