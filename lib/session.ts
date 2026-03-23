// In-memory session store.
// No disk I/O during the consultation — Map reads/writes are synchronous and fast.
// Sessions survive the 5–15 min consultation window in a single Next.js process.
// In dev with HMR, a hot-reload clears the Map — acceptable since dev sessions are short.

import type { SessionContext, ConversationTurn, SessionLog } from "@/types/session";

interface SessionEntry {
  context: SessionContext;
  transcript: ConversationTurn[];
  deflections: number;
  startedAt: string;
}

// Anchor to globalThis so the Map survives Next.js dev HMR module re-evaluation.
// In production a single process is used and this is equivalent to a plain Map.
declare global { var __sessionStore: Map<string, SessionEntry> | undefined; }
const store: Map<string, SessionEntry> =
  globalThis.__sessionStore ?? (globalThis.__sessionStore = new Map());

export function createSession(id: string, context: SessionContext): void {
  store.set(id, {
    context,
    transcript: [],
    deflections: 0,
    startedAt: new Date().toISOString(),
  });
}

export function getContext(id: string): SessionContext | undefined {
  return store.get(id)?.context;
}

export function appendTurn(id: string, turn: ConversationTurn): void {
  const entry = store.get(id);
  if (!entry) return;
  entry.transcript.push(turn);
  if (turn.role === "system" && turn.text.includes("Krishi Sewak")) {
    entry.deflections += 1;
  }
}

export function buildLog(id: string, state: string): SessionLog | null {
  const entry = store.get(id);
  if (!entry) return null;
  const { context, transcript, deflections, startedAt } = entry;

  // Mask PII before writing to disk
  const maskedTranscript = transcript.map((t) => ({
    ...t,
    text: t.text
      .replace(/\b\d{12}\b/g, "[MASKED]")
      .replace(/\b[6-9]\d{9}\b/g, "[MASKED]"),
  }));

  return {
    session_id: id,
    timestamp: startedAt,
    operator_csc_id: "",
    card_format_detected: context.farmer.card_format,
    district: context.farmer.district,
    state,
    language: context.session.language_code,
    crop: context.session.crop,
    fertilizer_type: context.session.fertilizer_type,
    priority_deficiencies: context.recommendations.priority_deficiencies,
    conversation_turns: transcript.length,
    deflections,
    transcript: maskedTranscript,
    extraction_confidence: "HIGH",
  };
}

export function deleteSession(id: string): void {
  store.delete(id);
}
