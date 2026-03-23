"use client";

import { LANG_OPTIONS, type LangKey } from "@/lib/i18n";

interface Props {
  onSelect: (langKey: LangKey) => void;
}

export default function LanguagePicker({ onSelect }: Props) {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-4xl mb-4">🌱</div>
          <h1 className="text-2xl font-bold text-neutral-900">Soil Health Card</h1>
          {/* Multilingual tagline so any farmer recognises their language */}
          <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
            अपनी भाषा चुनें · தேர்ந்தெடுக்கவும் · ভাষা বেছে নিন
          </p>
          <p className="text-xs text-neutral-400 mt-1">Select your language</p>
        </div>

        {/* Language grid */}
        <div className="grid grid-cols-2 gap-3">
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onSelect(opt.key)}
              className="group flex flex-col items-start p-4 rounded-xl border border-neutral-200 bg-white hover:border-neutral-900 hover:bg-neutral-50 transition-all text-left"
            >
              <span className="text-2xl font-bold text-neutral-900 leading-tight group-hover:text-neutral-900">
                {opt.native}
              </span>
              <span className="text-xs text-neutral-400 mt-1">{opt.english}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
