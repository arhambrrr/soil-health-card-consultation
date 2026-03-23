import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { vision, groqCompletion } from "@/lib/sarvam";
import { createSession } from "@/lib/session";
import { detectUnit, toAcres, perAcre, rangeMidpoint } from "@/lib/normalization";
import { buildLocalizedOpeningText } from "@/lib/i18n";
import type { SessionContext, FertilizerType, SoilParameter } from "@/types/session";

export const maxDuration = 60; // Sarvam Vision may take longer than Groq

// ── Vision prompt — instructs the model to output raw structured text ─────────

const VISION_PROMPT = `Extract all text from this Soil Health Card (SHC) image.
Preserve the exact layout of all tables — output each table row on its own line with columns separated by " | ".
Preserve all numbers exactly as printed. Do not convert or interpret any values.
Preserve Hindi and regional language text (कमी, सामान्य, अधिक, निष्कर्ष, Anushansa, etc.) exactly as printed. Do not translate.
Include all visible text: farmer name, village, district, plot area, sample ID, all 12 soil parameter rows (value + status + normal range), the fertilizer recommendation table (all crop rows, all columns), micronutrient rows, and any footnotes.
Output plain text only — no markdown formatting, no commentary, no extra explanation.`;

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeParseJSON(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in LLM response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeSoilStatus(raw: string | null | undefined): "low" | "normal" | "high" {
  if (!raw) return "normal";
  const s = raw.toString().toLowerCase().trim();
  if (s === "low" || s.includes("कमी") || s.includes("न्यून") || s.includes("insufficient") || s.includes("deficient")) return "low";
  if (s === "high" || s.includes("अधिक") || s.includes("ज्यादा") || s.includes("excess")) return "high";
  return "normal";
}

function prioritizeDeficiencies(soil: SessionContext["soil"], crop: string): string[] {
  const deficient = Object.entries(soil)
    .filter(([, v]) => v.status === "low")
    .map(([k]) => k);
  const cropPriority: Record<string, string[]> = {
    wheat: ["N", "P", "K", "Zn", "S"],
    paddy: ["N", "Zn", "K", "P", "S"],
    maize: ["N", "P", "Zn", "K"],
    cotton: ["N", "K", "S", "Zn"],
    default: ["N", "P", "K", "Zn", "S", "B", "Fe", "Mn", "Cu", "OC"],
  };
  const cropKey = crop.toLowerCase();
  const priority =
    cropPriority[cropKey] ??
    cropPriority[Object.keys(cropPriority).find((k) => cropKey.includes(k)) ?? ""] ??
    cropPriority.default;
  return [...deficient]
    .sort((a, b) =>
      (priority.indexOf(a) === -1 ? 99 : priority.indexOf(a)) -
      (priority.indexOf(b) === -1 ? 99 : priority.indexOf(b))
    )
    .slice(0, 3);
}

// Deterministic opening message in farmer's language — no LLM call needed.
function buildOpeningText(ctx: SessionContext, langKey: string): string {
  const { farmer, recommendations } = ctx;
  const rec  = recommendations.per_acre;
  const defs = recommendations.priority_deficiencies.slice(0, 2);
  return buildLocalizedOpeningText(langKey, {
    name:     farmer.name,
    defs,
    crop:     recommendations.selected_crop,
    urea:     rec.urea_kg,
    fert:     recommendations.fertilizer_type,
    fertQty:  rec.primary_phosphate_kg,
    potash:   rec.potash_kg,
  });
}

// Extraction prompt for the LLM — receives OCR text, returns structured JSON
function buildExtractionPrompt(ocrText: string, crop: string, fertilizerType: string): string {
  return `You are extracting data from a Soil Health Card (SHC) document. The card text (OCR output) is below.

Extract and return ONLY a valid JSON object with this exact structure. Use null for any value not found.

{
  "card_format": "NEW or OLD",
  "farmer": {
    "name": "",
    "village": "",
    "district": "",
    "plot_area": 0.0,
    "plot_area_unit": "decimal|acre|hectare|guntha|cent",
    "card_cycle": "",
    "card_expired": false
  },
  "soil": {
    "pH":  {"value": 0.0, "status": "low|normal|high", "normal_range": ""},
    "EC":  {"value": 0.0, "status": "low|normal|high", "normal_range": ""},
    "OC":  {"value": 0.0, "status": "low|normal|high", "normal_range": ""},
    "N":   {"value": 0.0, "status": "low|normal|high", "normal_range": ""},
    "P":   {"value": 0.0, "status": "low|normal|high", "normal_range": ""},
    "K":   {"value": 0.0, "status": "low|normal|high", "normal_range": ""},
    "S":   {"value": 0.0, "status": "low|normal|high", "normal_range": ""},
    "Zn":  {"value": 0.0, "status": "low|normal|high", "normal_range": ""},
    "B":   {"value": 0.0, "status": "low|normal|high", "normal_range": ""},
    "Fe":  {"value": 0.0, "status": "low|normal|high", "normal_range": ""},
    "Mn":  {"value": 0.0, "status": "low|normal|high", "normal_range": ""},
    "Cu":  {"value": 0.0, "status": "low|normal|high", "normal_range": ""}
  },
  "recommendations": {
    "selected_crop_row": {
      "crop": "${crop}",
      "urea_kg": 0,
      "dap_kg": 0,
      "ssp_kg": 0,
      "potash_kg": 0,
      "is_per_acre": true
    },
    "zinc_sulphate": ""
  }
}

Notes:
- NEW format (post-2023): foldable card, color-coded, recommendations already in kg/acre. is_per_acre = true.
- OLD format (pre-2023): single large page, recommendations are per-holding (total), not per-acre. is_per_acre = false.
  Old cards have two Anushansa columns: Anushansa 1 = DAP-based, Anushansa 2 = SSP-based.
  Operator selected fertilizer type: ${fertilizerType}. Use the matching Anushansa column.
- For plot_area_unit: detect from the card label (Decimal/Acre/Hectare/Guntha/Gunta/Cent).
- For soil status: map card values (कमी/Low/Deficient → "low", सामान्य/Normal/Sufficient → "normal", अधिक/High/Excess → "high").
- For zinc_sulphate: extract the quantity as a string (e.g., "5-10" or "7.5") from micronutrient recommendations.

Return ONLY the JSON object, no explanation.

--- CARD TEXT START ---
${ocrText}
--- CARD TEXT END ---`;
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("image") as File | null;
    const languageCode = form.get("language_code") as string;
    const dialect = form.get("dialect") as string;
    const fertilizerType = (form.get("fertilizer_type") as FertilizerType) ?? "DAP";
    const crop = form.get("crop") as string;

    if (!file) return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
    if (!languageCode || !crop) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const imageBuffer = await file.arrayBuffer();
    const mimeType = file.type || "image/jpeg";

    // Step 1: Vision OCR — synchronous, returns in 2–5 s
    const t0 = Date.now();
    console.log("[extract] Starting Vision OCR for", file.name, mimeType, "size:", imageBuffer.byteLength);
    const ocrText = await vision(imageBuffer, mimeType, VISION_PROMPT);
    console.log("[extract] OCR done in", Date.now() - t0, "ms, text length:", ocrText.length);

    // Step 1.5: Validate this is actually a Soil Health Card
    const SHC_KEYWORDS = [
      "soil health card", "मृदा स्वास्थ्य", "ph", "nitrogen", "phosphorus",
      "potassium", "organic carbon", "urea", "dap", "ssp", "potash", "mop",
      "anushansa", "अनुशंसा", "उर्वरक", "नाइट्रोजन", "soil sample",
      "fertilizer", "soil test", "muriate",
    ];
    const lowerOcr = ocrText.toLowerCase();
    const shcMatches = SHC_KEYWORDS.filter((kw) => lowerOcr.includes(kw));
    console.log("[extract] SHC keyword matches:", shcMatches.length, shcMatches);
    if (shcMatches.length < 3) {
      return NextResponse.json(
        { error: "This does not appear to be a Soil Health Card. Please upload a valid SHC image." },
        { status: 400 },
      );
    }

    // Step 2: LLM extraction
    const t1 = Date.now();
    console.log("[extract] Starting LLM extraction");
    const llmResponse = await groqCompletion(
      "You extract structured data from OCR text. Return only valid JSON.",
      [{ role: "user", content: buildExtractionPrompt(ocrText, crop, fertilizerType) }],
      2000,
    );
    console.log("[extract] LLM done in", Date.now() - t1, "ms, preview:", llmResponse.slice(0, 200));

    const extracted = safeParseJSON(llmResponse) as {
      card_format: "NEW" | "OLD";
      farmer: { name: string; village: string; district: string; plot_area: number; plot_area_unit: string; card_cycle: string; card_expired: boolean };
      soil: Record<string, { value: number | null; status: string; normal_range: string }>;
      recommendations: {
        selected_crop_row: { crop: string; urea_kg: number; dap_kg: number; ssp_kg: number; potash_kg: number; is_per_acre: boolean };
        zinc_sulphate: string;
      };
    };

    // Step 3: Build SessionContext with normalization
    const unit = detectUnit(extracted.farmer.plot_area_unit ?? "decimal");
    const plotAcres = toAcres(extracted.farmer.plot_area ?? 0, unit);

    const rec = extracted.recommendations.selected_crop_row;
    const isPerAcre = rec.is_per_acre ?? extracted.card_format === "NEW";
    const ureaKg = isPerAcre ? rec.urea_kg : perAcre(rec.urea_kg, plotAcres);
    const phosphateKg = isPerAcre
      ? fertilizerType === "DAP" ? rec.dap_kg : rec.ssp_kg
      : perAcre(fertilizerType === "DAP" ? rec.dap_kg : rec.ssp_kg, plotAcres);
    const potashKg = isPerAcre ? rec.potash_kg : perAcre(rec.potash_kg, plotAcres);

    const znRaw = extracted.recommendations.zinc_sulphate ?? "";
    const znTotal = znRaw ? rangeMidpoint(znRaw) : 0;
    const znPerAcre = znTotal > 0 ? (isPerAcre ? znTotal : perAcre(znTotal, plotAcres)) : undefined;

    const soil: SessionContext["soil"] = {} as SessionContext["soil"];
    for (const [k, v] of Object.entries(extracted.soil ?? {})) {
      (soil as Record<string, SoilParameter>)[k] = {
        value: v.value,
        status: normalizeSoilStatus(v.status),
        normal_range: v.normal_range,
      };
    }

    const ctx: SessionContext = {
      farmer: {
        name: extracted.farmer.name ?? "",
        village: extracted.farmer.village ?? "",
        district: extracted.farmer.district ?? "",
        plot_area_acres: plotAcres,
        card_format: extracted.card_format ?? "OLD",
        card_cycle: extracted.farmer.card_cycle ?? "",
        card_expired: extracted.farmer.card_expired ?? false,
      },
      soil,
      recommendations: {
        fertilizer_type: fertilizerType,
        selected_crop: crop,
        per_acre: {
          urea_kg: ureaKg,
          primary_phosphate_kg: phosphateKg,
          potash_kg: potashKg,
        },
        micronutrients: {
          zinc_sulphate_kg_approximate: znPerAcre,
          other: [],
        },
        priority_deficiencies: prioritizeDeficiencies(soil, crop),
      },
      session: { language_code: languageCode, dialect, crop, fertilizer_type: fertilizerType },
    };

    const sessionId = uuidv4();
    createSession(sessionId, ctx);

    return NextResponse.json({
      sessionId,
      context: ctx,
      openingText: buildOpeningText(ctx, `${languageCode}::${dialect}`),
    });
  } catch (err) {
    console.error("Extract error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed" },
      { status: 500 },
    );
  }
}
