"use client";

import { useState, useReducer, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SessionContext, ConversationTurn } from "@/types/session";
import { translateCrop, type Translations } from "@/lib/i18n";
import TranscriptPanel from "./TranscriptPanel";
import PushToTalkButton from "./PushToTalkButton";

// ── State machine ─────────────────────────────────────────────────────────────

type Phase =
  | "LOADING_OPENING"
  | "IDLE"
  | "RECORDING"
  | "PROCESSING"
  | "PLAYING"
  | "AUTO_ENDING"
  | "ENDED";

interface UIState {
  phase: Phase;
  turns: ConversationTurn[];
  history: { role: "user" | "assistant"; content: string }[];
  streamingText: string;
  error: string | null;
}

type Action =
  | { type: "RESPOND_DONE"; farmerText: string; systemText: string; isOpening: boolean }
  | { type: "STREAM_SENTENCE"; text: string }
  | { type: "FIRST_CHUNK" }
  | { type: "RECORD_START" }
  | { type: "AUDIO_CAPTURED" }
  | { type: "ERROR"; msg: string }
  | { type: "AUTO_END" }
  | { type: "END" };

function reducer(state: UIState, action: Action): UIState {
  switch (action.type) {
    case "RECORD_START":
      if (state.phase !== "IDLE") return state;
      return { ...state, phase: "RECORDING", error: null };

    case "AUDIO_CAPTURED":
      return { ...state, phase: "PROCESSING", streamingText: "" };

    case "FIRST_CHUNK":
      if (state.phase !== "LOADING_OPENING" && state.phase !== "PROCESSING") return state;
      return { ...state, phase: "PLAYING" };

    case "STREAM_SENTENCE":
      return {
        ...state,
        streamingText: state.streamingText
          ? state.streamingText + " " + action.text
          : action.text,
      };

    case "RESPOND_DONE": {
      const now = new Date().toISOString();
      const newTurns: ConversationTurn[] = [];
      if (!action.isOpening && action.farmerText)
        newTurns.push({ role: "farmer", text: action.farmerText, timestamp: now });
      if (action.systemText)
        newTurns.push({ role: "system", text: action.systemText, timestamp: now });
      return {
        ...state,
        phase: "IDLE",
        error: null,
        streamingText: "",
        turns: [...state.turns, ...newTurns],
        history: action.isOpening ? state.history : [
          ...state.history,
          { role: "user" as const, content: action.farmerText },
          { role: "assistant" as const, content: action.systemText },
        ],
      };
    }

    case "ERROR":
      return { ...state, phase: "IDLE", error: action.msg, streamingText: "" };

    case "AUTO_END":
      return { ...state, phase: "AUTO_ENDING" };

    case "END":
      return { ...state, phase: "ENDED" };

    default:
      return state;
  }
}

// ── Streaming audio + text ────────────────────────────────────────────────────

const CHUNK_TEXT  = 0x02;
const CHUNK_AUDIO = 0x01;

async function consumeStream(
  response: Response,
  audioCtx: AudioContext,
  onFirstChunk: () => void,
  onSentence: (text: string) => void,
): Promise<number> {
  const reader = response.body!.getReader();
  let partial = new Uint8Array(0);
  let nextStartTime = 0;
  let firstFired = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const combined = new Uint8Array(partial.length + value.length);
    combined.set(partial);
    combined.set(value, partial.length);
    partial = combined;

    while (partial.length >= 5) {
      const type = partial[0];
      const view = new DataView(partial.buffer, partial.byteOffset, partial.byteLength);
      const frameLen = view.getUint32(1, false);
      if (partial.length < 5 + frameLen) break;

      const frameData = partial.slice(5, 5 + frameLen);
      partial = partial.slice(5 + frameLen);

      if (type === CHUNK_TEXT) {
        onSentence(new TextDecoder().decode(frameData));
        // Trigger phase transition as soon as the first text chunk arrives —
        // before audio decodes — so the UI never stays stuck in LOADING_OPENING.
        if (!firstFired) { firstFired = true; onFirstChunk(); }
      } else if (type === CHUNK_AUDIO) {
        try {
          const buf = frameData.buffer.slice(
            frameData.byteOffset,
            frameData.byteOffset + frameData.byteLength,
          ) as ArrayBuffer;
          const audioBuf = await audioCtx.decodeAudioData(buf);
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuf;
          source.playbackRate.value = 1.18; // Speed up TTS to natural human pace
          source.connect(audioCtx.destination);
          const now = audioCtx.currentTime;
          if (nextStartTime < now + 0.05) nextStartTime = now + 0.05;
          source.start(nextStartTime);
          nextStartTime += audioBuf.duration / 1.18; // Adjust schedule for faster playback
        } catch (err) {
          console.error("[audio] decode error:", err);
        }
      }
    }
  }

  return nextStartTime;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  sessionId: string;
  context: SessionContext;
  state: string;
  openingText?: string;
  t?: Translations;
}

export default function ConsultationUI({ sessionId, context, state, openingText, t }: Props) {
  const router = useRouter();
  // Gate: user must tap to start — this creates AudioContext from a user gesture,
  // which is REQUIRED by Chrome/Safari autoplay policy for audio to play.
  const [started, setStarted] = useState(false);

  const [uiState, dispatch] = useReducer(reducer, {
    phase: "LOADING_OPENING",
    turns: [],
    history: [],
    streamingText: "",
    error: null,
  });
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  function getAudioCtx(): AudioContext {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(console.error);
    }
    return audioCtxRef.current;
  }

  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  useEffect(() => { historyRef.current = uiState.history; }, [uiState.history]);

  const handleEndSessionRef = useRef<() => Promise<void>>(undefined);

  // ── Core: send to /api/respond and consume streaming response ────────────

  const sendToRespond = useCallback(async (
    audioBlob: Blob | null,
    text: string | null,
    isOpening: boolean,
  ) => {
    const form = new FormData();
    form.append("sessionId", sessionId);
    form.append("context", JSON.stringify(context));
    form.append("history", JSON.stringify(historyRef.current));
    if (isOpening) form.append("speak_only", "1");
    if (audioBlob) form.append("audio", audioBlob, "audio.webm");
    else if (text)  form.append("text", text);

    let res: Response;
    try {
      res = await fetch("/api/respond", { method: "POST", body: form });
    } catch {
      dispatch({ type: "ERROR", msg: "Network error. Please try again." });
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      dispatch({ type: "ERROR", msg: (data as { error?: string }).error ?? `Request failed (${res.status})` });
      return;
    }

    const farmerText = decodeURIComponent(res.headers.get("X-Transcript") ?? "");
    const systemText = decodeURIComponent(res.headers.get("X-Response-Text") ?? "");
    const autoEnd = res.headers.get("X-Session-End") === "1";

    const audioCtx = getAudioCtx();
    let audioEndTime = 0;
    try {
      audioEndTime = await consumeStream(
        res,
        audioCtx,
        () => dispatch({ type: "FIRST_CHUNK" }),
        (sentence) => dispatch({ type: "STREAM_SENTENCE", text: sentence }),
      );
    } catch (err) {
      console.error("[audio] stream error:", err);
    }

    dispatch({ type: "RESPOND_DONE", farmerText, systemText, isOpening });

    // Auto-end: wait for audio to finish, show "ending" label, then navigate home
    if (autoEnd && !isOpening) {
      const remaining = Math.max(0, audioEndTime - audioCtx.currentTime);
      setTimeout(() => {
        dispatch({ type: "AUTO_END" });
        setTimeout(() => {
          handleEndSessionRef.current?.();
        }, 1200);
      }, remaining * 1000);
    }
  }, [sessionId]);

  // ── Opening — triggered by user tap (required for AudioContext policy) ────

  const openingFiredRef = useRef(false);
  const handleStart = useCallback(() => {
    // Create AudioContext inside a click handler — browser allows this
    getAudioCtx();
    setStarted(true);
    if (!openingFiredRef.current) {
      openingFiredRef.current = true;
      sendToRespond(null, openingText ?? buildFallbackOpening(context), true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendToRespond, openingText, context]);

  // ── Event handlers ────────────────────────────────────────────────────────

  const handleAudio = useCallback((blob: Blob) => {
    dispatch({ type: "AUDIO_CAPTURED" });
    sendToRespond(blob, null, false);
  }, [sendToRespond]);

  const handleEndSession = useCallback(async () => {
    dispatch({ type: "END" });
    audioCtxRef.current?.close().catch(() => {});
    try {
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, state }),
      });
    } catch (err) {
      console.error("Session log error:", err);
    }
    router.push("/");
  }, [sessionId, state, router]);

  // Keep ref in sync so sendToRespond can call handleEndSession without stale closure
  handleEndSessionRef.current = handleEndSession;

  // ── Render ────────────────────────────────────────────────────────────────

  const { phase, turns, streamingText, error } = uiState;
  const rec = context.recommendations;
  const phosphateName = context.session.fertilizer_type;
  const isDisabled = phase !== "IDLE";

  const phaseLabel: string | null =
    phase === "LOADING_OPENING" ? (t?.starting       ?? "Starting...") :
    phase === "RECORDING"       ? (t?.listening      ?? "Listening...") :
    phase === "PROCESSING"      ? (t?.thinking       ?? "Thinking...") :
    phase === "PLAYING"         ? (t?.speaking       ?? "Speaking...") :
    phase === "AUTO_ENDING"     ? (t?.endingSession  ?? "Ending session...") :
    null;

  const hintText =
    phase === "LOADING_OPENING" || phase === "PLAYING"
      ? (t?.waitForSystem      ?? "Wait for system to finish speaking")
      : phase === "PROCESSING"
      ? (t?.generatingResponse ?? "Generating response...")
      : phase === "RECORDING"
      ? (t?.releaseToSend      ?? "Release to send")
      : (t?.holdAndSpeak       ?? "Hold the button and speak, release to send");

  // ── "Tap to start" gate ─────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white px-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold text-neutral-900 mb-1">
            {context.farmer.name || "Farmer"}
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            {rec.selected_crop} · {phosphateName} · {context.farmer.village || context.farmer.district}
          </p>
          <button
            onClick={handleStart}
            className="w-full py-4 px-6 bg-green-800 text-white rounded-2xl font-semibold text-lg hover:bg-green-900 transition-colors active:scale-[0.98]"
          >
            🔊 {t?.startSpeaking ?? "Tap to Start Consultation"}
          </button>
          <p className="text-xs text-neutral-400 mt-3">{t?.tapToStartHint ?? "Audio will begin playing"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-white shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-neutral-900">
              {context.farmer.name || "Farmer"}
            </h1>
            <p className="text-sm text-neutral-500">
              {rec.selected_crop} · {phosphateName} · {context.farmer.village || context.farmer.district}
            </p>
          </div>

          {phaseLabel && (
            <span className="text-xs text-neutral-500 font-medium">{phaseLabel}</span>
          )}
        </div>

        <button
          onClick={() => setShowEndConfirm(true)}
          disabled={phase === "ENDED" || phase === "AUTO_ENDING"}
          className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg text-sm font-medium hover:border-neutral-900 hover:text-neutral-900 transition-colors disabled:opacity-40"
        >
          {t?.endSession ?? "End Session"}
        </button>
      </header>

      {/* Recommendations bar */}
      <div className="px-6 py-2.5 bg-white border-b border-neutral-200 flex items-center gap-6 text-sm shrink-0 overflow-x-auto">
        <span className="text-neutral-500 font-medium whitespace-nowrap">{t?.perAcre ?? "Per acre:"}</span>
        <span className="font-semibold text-neutral-900 whitespace-nowrap">Urea {rec.per_acre.urea_kg} kg</span>
        <span className="font-semibold text-neutral-900 whitespace-nowrap">{phosphateName} {rec.per_acre.primary_phosphate_kg} kg</span>
        <span className="font-semibold text-neutral-900 whitespace-nowrap">Potash {rec.per_acre.potash_kg} kg</span>
        {rec.micronutrients.zinc_sulphate_kg_approximate && (
          <span className="font-semibold text-neutral-900 whitespace-nowrap">
            Zinc ~{rec.micronutrients.zinc_sulphate_kg_approximate} kg
          </span>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-6 py-2 border-b border-neutral-200 text-xs text-neutral-900 font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Transcript + live streaming bubble */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <TranscriptPanel turns={turns.filter((turn) => turn.text)} t={t} />

        {streamingText && (
          <div className="px-4 pb-3 shrink-0">
            <div className="flex items-start gap-3">
              <div className="w-0.5 self-stretch bg-neutral-300 shrink-0 ml-1" />
              <p className="text-sm text-neutral-700 leading-relaxed italic">{streamingText}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 border-t border-neutral-200 bg-white p-6 flex flex-col items-center gap-2">
        <PushToTalkButton
          onAudio={handleAudio}
          onError={(msg) => dispatch({ type: "ERROR", msg })}
          disabled={isDisabled}
          t={t}
        />
        <p className="text-xs text-neutral-400">{hintText}</p>
      </div>

      {/* End session confirm */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 border border-neutral-200 space-y-4">
            <h2 className="font-bold text-neutral-900">{t?.endSessionTitle ?? "End this session?"}</h2>
            <p className="text-sm text-neutral-500">
              {t?.endSessionBody ?? "The conversation will be saved and the session will close."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-2.5 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:border-neutral-900"
              >
                {t?.cancel ?? "Cancel"}
              </button>
              <button
                onClick={handleEndSession}
                className="flex-1 py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-black"
              >
                {t?.endSession ?? "End Session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFICIENCY_NAMES: Record<string, string> = {
  N: "Nitrogen", P: "Phosphorus", K: "Potash", S: "Sulphur",
  Zn: "Zinc", B: "Boron", Fe: "Iron", Mn: "Manganese",
  Cu: "Copper", OC: "Organic Carbon",
};

function buildFallbackOpening(ctx: SessionContext): string {
  const defs = ctx.recommendations.priority_deficiencies.slice(0, 2);
  const defStr = defs.length > 0
    ? defs.map((d) => DEFICIENCY_NAMES[d] ?? d).join(" aur ")
    : "koi badi kami nahi";
  const { farmer, recommendations } = ctx;
  const rec = recommendations.per_acre;
  const name = farmer.name ? `${farmer.name} ji, ` : "";
  return (
    `Namaste ${name}aapki mitti mein ${defStr} ki kami hai. ` +
    `Aapke ${translateCrop(recommendations.selected_crop, ctx.session.language_code)} ke liye, pratyek acre mein ` +
    `${Math.round(rec.urea_kg)} kilo urea, ${Math.round(rec.primary_phosphate_kg)} kilo ${recommendations.fertilizer_type}, ` +
    `aur ${Math.round(rec.potash_kg)} kilo potash ki zaroorat hai. Koi sawaal poochh sakte hain.`
  );
}
