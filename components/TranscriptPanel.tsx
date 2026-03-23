"use client";

import { useEffect, useRef } from "react";
import type { ConversationTurn } from "@/types/session";
import type { Translations } from "@/lib/i18n";

interface Props {
  turns: ConversationTurn[];
  t?: Translations;
}

export default function TranscriptPanel({ turns, t }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  if (turns.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm italic">
        Conversation will appear here...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {turns.map((turn, i) => (
        <div
          key={i}
          className={`flex flex-col gap-0.5 ${turn.role === "farmer" ? "items-end" : "items-start"}`}
        >
          <span className="text-xs text-neutral-400 px-1">
            {turn.role === "farmer"
              ? (t?.farmerLabel ?? "Farmer")
              : (t?.systemLabel ?? "System")}
          </span>
          <div
            className={`max-w-[80%] text-sm leading-relaxed ${
              turn.role === "farmer"
                ? "bg-neutral-100 text-neutral-900 rounded-xl rounded-tr-sm px-4 py-2.5"
                : turn.text.startsWith("⚠️")
                ? "pl-3 border-l-2 border-amber-500 text-neutral-900 py-1"
                : "pl-3 border-l-2 border-neutral-300 text-neutral-700 py-1"
            }`}
          >
            {turn.text}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
