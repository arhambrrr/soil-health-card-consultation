import { NextRequest, NextResponse } from "next/server";
import { speechToText, chatCompletion, textToSpeech } from "@/lib/sarvam";
import { getContext, createSession, appendTurn } from "@/lib/session";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { sanitizeInput, validateOutput, getCannedDeflection } from "@/lib/guardrails";
import type { SessionContext } from "@/types/session";

export const maxDuration = 60;

// Chunk type bytes
const CHUNK_TEXT  = 0x02;
const CHUNK_AUDIO = 0x01;

// Split LLM response into speakable sentences for progressive TTS.
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[।.?!])\s+|(?<=[।.?!])$/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

// Format: [type: 1 byte][length: 4-byte big-endian uint32][data]
async function writeTypedChunk(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  type: number,
  data: Uint8Array,
): Promise<void> {
  const header = new Uint8Array(5);
  header[0] = type;
  new DataView(header.buffer).setUint32(1, data.byteLength, false);
  await writer.write(header);
  await writer.write(data);
}

// Accepts FormData with:
//   sessionId       — required
//   audio?: File    — farmer voice (triggers STT + LLM + TTS)
//   text?: string   — text input (triggers LLM + TTS)
//   speak_only?: "1" — skip LLM, go straight to TTS (used for opening message)
//   history?: JSON  — conversation history for LLM context
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const form = await req.formData();
    const sessionId = form.get("sessionId") as string;
    const audioFile = form.get("audio") as File | null;
    const textInput = form.get("text") as string | null;
    const speakOnly = form.get("speak_only") === "1";
    const historyRaw = (form.get("history") as string) || "[]";

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    // Try in-memory first; fall back to client-provided context (Vercel Lambdas
    // don't share memory, so the extract route's Lambda won't be this one).
    let ctx = getContext(sessionId);
    if (!ctx) {
      const contextRaw = form.get("context") as string | null;
      if (contextRaw) {
        ctx = JSON.parse(contextRaw) as SessionContext;
        createSession(sessionId, ctx); // cache for subsequent calls on this Lambda
      }
    }
    if (!ctx) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    // Step 1: Resolve transcript
    const t0 = Date.now();
    let transcript: string;
    if (audioFile && audioFile.size > 0) {
      const buffer = await audioFile.arrayBuffer();
      const mimeType = (audioFile.type || "audio/webm").split(";")[0];
      transcript = await speechToText(buffer, mimeType, ctx.session.language_code);
      console.log("[respond] STT done in", Date.now() - t0, "ms");
    } else {
      transcript = textInput ?? "";
    }

    if (!transcript.trim()) {
      return NextResponse.json({ error: "Empty transcript" }, { status: 400 });
    }

    // Step 2: Resolve output text
    let outputText: string;
    let guardrailFlags: string[] = [];

    if (speakOnly) {
      outputText = transcript;
    } else {
      // Pre-LLM: check for jailbreak/manipulation in farmer's speech
      const { clean: cleanTranscript, flagged } = sanitizeInput(transcript);
      if (flagged) {
        console.log("[guardrails] input flagged as jailbreak, using canned deflection");
        outputText = getCannedDeflection(ctx.session.language_code);
        guardrailFlags.push("jailbreak_blocked");
      } else {
        const t1 = Date.now();
        const history = JSON.parse(historyRaw) as { role: "user" | "assistant"; content: string }[];
        const systemPrompt = buildSystemPrompt(ctx);
        const messages = [...history, { role: "user" as const, content: cleanTranscript }];
        outputText = await chatCompletion(systemPrompt, messages);
        console.log("[respond] LLM done in", Date.now() - t1, "ms, preview:", outputText.slice(0, 100));

        // Post-LLM: validate and clean output
        const { clean, flags } = validateOutput(outputText, ctx);
        if (flags.length > 0) {
          console.log("[guardrails] output flags:", flags.join(", "));
          guardrailFlags = flags;
        }
        outputText = clean;
      }
    }

    // Step 2b: Detect auto-end marker from LLM (farmer said goodbye)
    let autoEnd = false;
    if (!speakOnly && outputText.includes("[SESSION_END]")) {
      autoEnd = true;
      outputText = outputText.replace(/\[SESSION_END\]/g, "").trim();
      console.log("[respond] auto-end detected — farmer is done");
    }

    // Step 3: Stream interleaved text+audio chunks sentence by sentence.
    // TTS calls fire in parallel for all sentences; results stream in order.
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const now = new Date().toISOString();
      const ttsStart = Date.now();
      try {
        const sentences = splitSentences(outputText);
        console.log("[respond] TTS: streaming", sentences.length, "sentences");
        // Fire ALL TTS calls in parallel
        const ttsPromises = sentences.map((s) =>
          textToSpeech(s, ctx.session.language_code),
        );
        // Stream text+audio in order — each TTS is already in-flight
        for (let i = 0; i < sentences.length; i++) {
          await writeTypedChunk(writer, CHUNK_TEXT, encoder.encode(sentences[i]));
          const audio = await ttsPromises[i];
          await writeTypedChunk(writer, CHUNK_AUDIO, new Uint8Array(audio));
        }
        console.log("[respond] TTS pipeline done in", Date.now() - ttsStart, "ms for", sentences.length, "sentences");
        if (!speakOnly) {
          appendTurn(sessionId, { role: "farmer", text: transcript, timestamp: now });
          appendTurn(sessionId, {
            role: "system",
            text: outputText,
            timestamp: now,
            ...(guardrailFlags.length > 0 ? { flags: guardrailFlags } : {}),
          });
        }
      } catch (err) {
        console.error("[respond] TTS pipeline error:", err);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-cache",
        "X-Transcript": encodeURIComponent(transcript),
        "X-Response-Text": encodeURIComponent(outputText),
        ...(autoEnd ? { "X-Session-End": "1" } : {}),
        "Access-Control-Expose-Headers": "X-Transcript, X-Response-Text, X-Session-End",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Respond failed";
    console.error("[respond] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
