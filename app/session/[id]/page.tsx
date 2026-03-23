"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { getTranslations } from "@/lib/i18n";
import type { SessionContext } from "@/types/session";
import ConsultationUI from "@/components/ConsultationUI";

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<{ context: SessionContext; openingText?: string } | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(`shc-session-${id}`);
    if (raw) {
      setData(JSON.parse(raw));
    } else {
      // No session data found — go back to intake
      router.replace("/");
    }
  }, [id, router]);

  if (!data) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <p className="text-neutral-400 text-sm">Loading session...</p>
      </div>
    );
  }

  const state = searchParams.get("state") ?? "";
  const lang = searchParams.get("lang") ?? "hi-IN::Standard";
  const t = getTranslations(lang);

  return (
    <ConsultationUI
      sessionId={id}
      context={data.context}
      state={state}
      openingText={data.openingText}
      t={t}
    />
  );
}
