// API clients: Groq (Vision OCR) + Sarvam (LLM, TTS, STT).
// Keys are server-side only via env vars — never exposed to the client.

const SARVAM_BASE = "https://api.sarvam.ai";
const GROQ_BASE   = "https://api.groq.com/openai/v1";

function sarvamKey(): string {
  const k = process.env.SARVAM_API_KEY;
  if (!k) throw new Error("SARVAM_API_KEY environment variable not set");
  return k;
}
function groqKey(): string {
  const k = process.env.GROQ_API_KEY;
  if (!k) throw new Error("GROQ_API_KEY environment variable not set");
  return k;
}

// ── Language normalisation ────────────────────────────────────────────────────

const SUPPORTED = new Set([
  "bn-IN", "en-IN", "gu-IN", "hi-IN", "kn-IN",
  "ml-IN", "mr-IN", "od-IN", "pa-IN", "ta-IN", "te-IN",
]);
const FALLBACK: Record<string, string> = {
  "mai-IN": "hi-IN",
};
function normLang(code: string): string {
  if (SUPPORTED.has(code)) return code;
  return FALLBACK[code] ?? "hi-IN";
}

// ── Vision — Groq Llama 4 Scout (multimodal, ~2–4 s) ─────────────────────────
// Groq's OpenAI-compatible endpoint accepts base64 images in chat messages.

export async function vision(
  imageBuffer: ArrayBuffer,
  mimeType: string,
  prompt: string,
): Promise<string> {
  const base64 = typeof Buffer !== "undefined"
    ? Buffer.from(imageBuffer).toString("base64")
    : btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
  const dataUri = `data:${mimeType};base64,${base64}`;

  console.log("[vision] sending to Groq Llama 4 Scout, image size:", imageBuffer.byteLength, "bytes");
  const visionStart = Date.now();

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: dataUri } },
            { type: "text", text: prompt },
          ],
        },
      ],
      max_completion_tokens: 4096,
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Vision (Groq) ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json() as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  console.log("[vision] done in", Date.now() - visionStart, "ms, text length:", text.length);
  return text;
}

// ── TTS — Sarvam Bulbul v3 ────────────────────────────────────────────────────

export async function textToSpeech(
  text: string,
  languageCode: string,
  speaker = "neha",
): Promise<ArrayBuffer> {
  const lang = normLang(languageCode);
  console.log("[TTS] lang:", lang, "text[:60]:", text.slice(0, 60));

  // Retry once on failure — Sarvam TTS can be intermittent
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ttsStart = Date.now();
      const res = await fetch(`${SARVAM_BASE}/text-to-speech`, {
        method: "POST",
        headers: {
          "api-subscription-key": sarvamKey(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          target_language_code: lang,
          speaker,
          model: "bulbul:v3",
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`TTS ${res.status}: ${body.slice(0, 300)}`);
      }

      const data = await res.json() as { audios?: string[] };
      const base64 = data.audios?.[0];
      if (!base64) throw new Error("No audio in TTS response");

      // Use Buffer (Node) for fast base64 decoding, fallback to atob
      let bytes: Uint8Array;
      if (typeof Buffer !== "undefined") {
        bytes = new Uint8Array(Buffer.from(base64, "base64"));
      } else {
        const binary = atob(base64);
        bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      }
      console.log("[TTS] done in", Date.now() - ttsStart, "ms, audio bytes:", bytes.length);
      return bytes.buffer as ArrayBuffer;
    } catch (err) {
      if (attempt === 0) {
        console.warn("[TTS] attempt 1 failed, retrying:", (err as Error).message);
        continue;
      }
      throw err;
    }
  }
  throw new Error("TTS: unreachable");
}

// ── STT — Sarvam Saarika v2.5 ─────────────────────────────────────────────────

export async function speechToText(
  audioBuffer: ArrayBuffer,
  mimeType: string,
  languageCode: string,
): Promise<string> {
  const lang = normLang(languageCode);
  const cleanMime = mimeType.split(";")[0] || "audio/webm";
  console.log("[STT] lang:", lang, "mime:", cleanMime, "bytes:", audioBuffer.byteLength);

  const form = new FormData();
  form.append("file", new Blob([audioBuffer], { type: cleanMime }), "audio.webm");
  form.append("language_code", lang);
  form.append("model", "saarika:v2.5");

  const res = await fetch(`${SARVAM_BASE}/speech-to-text`, {
    method: "POST",
    headers: { "api-subscription-key": sarvamKey() },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`STT ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json() as { transcript?: string };
  console.log("[STT] transcript:", data.transcript?.slice(0, 100));
  return data.transcript ?? "";
}

// ── LLM — Groq Llama 3.3 70B (structured extraction) ────────────────────────
// Used for Phase 2 extraction only — reliably follows JSON-only instructions.

export async function groqCompletion(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens = 2000,
): Promise<string> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_completion_tokens: maxTokens,
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LLM (Groq) ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json() as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

// ── LLM — Sarvam 30B (Indic-optimized conversation) ─────────────────────────

export async function chatCompletion(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens = 300,
): Promise<string> {
  const res = await fetch(`${SARVAM_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${sarvamKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sarvam-30b",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LLM (Sarvam) ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json() as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}
