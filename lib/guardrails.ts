// Pre-LLM input sanitization and post-LLM output validation for the consultation agent.
// Three layers: (1) jailbreak detection on input, (2) forbidden topic detection on output,
// (3) sentence truncation + safety warnings on output.

import type { SessionContext } from "@/types/session";

// ── Jailbreak detection patterns ─────────────────────────────────────────────

const JAILBREAK_PATTERNS: RegExp[] = [
  // English jailbreak patterns
  /ignore\s+(previous|above|all|your|prior|these|system)\s+(instructions|rules|prompt|guidelines|constraints)/i,
  /you\s+are\s+now\b/i,
  /act\s+as\b/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /roleplay\s+as\b/i,
  /system\s+prompt/i,
  /system\s+message/i,
  /your\s+(instructions|rules|guidelines|prompt|constraints)/i,
  /\bDAN\s+mode\b/i,
  /\bjailbreak\b/i,
  /\bbypass\b/i,
  /\boverride\b/i,
  /forget\s+(your|all|everything|the\s+rules|previous|above)/i,
  /\bdisregard\b/i,
  /repeat\s+after\s+me\b/i,
  /say\s+exactly\b/i,
  /do\s+not\s+follow\s+(your|the)\s+(rules|instructions)/i,
  /new\s+(instructions|rules|mode)\s*:/i,
  /\benable\s+(developer|admin|god|unrestricted)\s+mode\b/i,
  /\bno\s+restrictions\b/i,

  // Hindi jailbreak patterns (romanized — STT often outputs romanized Hindi)
  /aap\s+ab\s+.*\bban\s+ja(o|iye|ye)\b/i,
  /apne\s+niyam\s+bhool\s+ja(o|iye|ye)\b/i,
  /apni\s+(instructions|hadh|seema)\s+(bhool|hatao|ignore)/i,
  /niyam\s+(tod|hatao|ignore|bhool)/i,
  /mujhe\s+.*\bbatao\s+jo\s+.*\ballowed\s+nahi\b/i,
  /apna\s+(role|kaam)\s+badal(o|iye)/i,

  // Hindi Devanagari jailbreak patterns
  /अपने\s+नियम\s+भूल\s+जा(ओ|इए|ये)/,
  /निर्देश(ों)?\s+(भूल|हटाओ|अनदेखा)/,
  /आप\s+अब\s+.*\bबन\s+जा(ओ|इए)/,
];

// ── Forbidden topic patterns (for output validation) ─────────────────────────

interface ForbiddenCategory {
  name: string;
  patterns: RegExp[];
}

const FORBIDDEN_TOPICS: ForbiddenCategory[] = [
  {
    name: "pesticide",
    patterns: [
      /\b(endosulfan|chlorpyrifos|monocrotophos|DDT|malathion|imidacloprid|cypermethrin|deltamethrin|profenofos|acephate)\b/i,
      /कीटनाशक/,
      /\b(keetnashak|keetnashk|kitnashak)\b/i,
      /\b(dawai|dawa)\s+spray\b/i,
      /\b(pesticide|insecticide|fungicide|herbicide|weedicide)\b/i,
      /\b(spray|chhidkav|chhidkaw)\b.*\b(dawai|dawa|chemical)\b/i,
    ],
  },
  {
    name: "pest_disease",
    patterns: [
      /\b(blast|blight|wilt|rust|smut|aphid|borer|mite|stem\s*borer|fruit\s*fly|army\s*worm)\b/i,
      /तना\s*छेदक/,
      /\b(rog|bimari|bimaari|keeda|keede|makodi)\b/i,
      /\b(disease|pest|infestation|infection)\b/i,
    ],
  },
  {
    name: "market_price",
    patterns: [
      /\b(mandi|bhav|bhaw|rate)\b/i,
      /\b(MSP|minimum\s+support\s+price)\b/i,
      /\b(market\s+price|selling\s+price|sell\s+at|buy\s+at|khareed|bikri|bech)\b/i,
      /मंडी/,
      /बाजार\s*भाव/,
    ],
  },
  {
    name: "government_scheme",
    patterns: [
      /\b(PM.?KISAN|PM.?Fasal|Kisan\s+Samman|PMFBY)\b/i,
      /\b(subsidy|yojana|yojna|scheme|DBT|direct\s+benefit)\b/i,
      /योजना/,
      /सब्सिडी/,
    ],
  },
  {
    name: "medical_veterinary",
    patterns: [
      /\b(doctor|hospital|clinic|medicine|tablet|injection|surgery)\b/i,
      /\b(janwar|janvar|pashu|bhains|gaay|bakri)\s+(bimar|bimaar|sick|ill)\b/i,
      /\b(veterinary|vet|animal\s+doctor)\b/i,
      /पशु\s*चिकित्सक/,
      /अस्पताल/,
    ],
  },
  {
    name: "political",
    patterns: [
      /\b(election|vote|voting|neta|politician)\b/i,
      /\b(MLA|MP|CM)\s+(sahab|ji|ne|ka|ki|ke)\b/i,
      /\b(sarkar|sarkaar|government)\b.*\b(acchi|buri|kharab|change|badlo)\b/i,
      /\b(party|BJP|Congress|BSP)\b/i,
      /\bAAP\s+(party|sarkar|sarkaar|government)\b/i,
      /\bSP\s+(party|sarkar|sarkaar|government)\b/i,
      /चुनाव/,
      /राजनीति/,
    ],
  },
  {
    name: "seed_variety",
    patterns: [
      /\b(beej|seed)\s+(kaunsa|kaun\s+sa|which|konsa|select|best|accha)\b/i,
      /\b(kaunsa|kaun\s+sa|which|konsa|best)\s+(beej|seed|variety)\b/i,
      /\b(variety|cultivar|hybrid)\s+(suggest|recommend|best|accha|select|karein)\b/i,
      /\b(seed|beej)\s+(variety|cultivar|selection)\b/i,
      /बीज\s*(चयन|चुन)/,
    ],
  },
  {
    name: "weather_irrigation",
    patterns: [
      /\b(mausam|weather|barish|rain|forecast|temperature|taapmaan)\b.*\b(kab|when|predict|batao)\b/i,
      /\b(sinchai|irrigation|paani|water)\s+(schedule|kab|timing|kitna)\b/i,
    ],
  },
];

// ── English whitelist (words allowed in non-English responses) ────────────────

const ENGLISH_WHITELIST = new Set([
  // Fertilizer names
  "urea", "dap", "ssp", "mop", "potash", "npk",
  // Nutrient symbols
  "n", "p", "k", "zn", "s", "b", "fe", "mn", "cu", "oc", "ph", "ec",
  // Units
  "kg", "kilo", "acre", "hectare", "decimal", "tonne",
  // Crop names commonly used in English even in Hindi
  "paddy", "wheat", "maize", "cotton", "mustard", "rice", "sugarcane", "gehun",
  // Technical terms that appear across languages
  "basal", "top-dress", "fym",
  // Common borrowed words
  "ok", "sir", "ji", "haan", "nahi",
  // Common romanized Hindi/Indic words that STT outputs in Latin script
  "aapke", "aapko", "aap", "aur", "mein", "hai", "ke", "ka", "ki", "ko", "se",
  "pratyek", "khet", "daalein", "daaliye", "daal", "chahiye", "liye", "kilo",
  "pehli", "doosri", "teesri", "sinchai", "pe", "par", "ya", "bhi", "yeh",
  "woh", "iska", "uska", "kya", "kaise", "kitna", "kitni", "kitne",
  "gehun", "dhan", "makka", "sarson", "chana", "arhar", "moong",
  "namaste", "ji", "haan", "nahi", "theek", "accha",
  "kami", "zyada", "bahut", "thoda", "kam", "adhik",
  "mitti", "zameen", "fasal", "khet", "paani",
]);

// ── Canned deflection responses by language ──────────────────────────────────

const CANNED_DEFLECTIONS: Record<string, string> = {
  "hi-IN": "Yeh sawaal mere daayare se bahar hai. Kripya apne Krishi Sewak se sampark karein.",
  "bho-IN": "Yeh sawaal mere daayare se bahar hai. Kripya apne Krishi Sewak se sampark karein.",
  "te-IN": "Ee prashna naa paridhi lo ledu. Dayachesi mee Krishi Sewak ni sampradinchandi.",
  "kn-IN": "Ee prashne nanna vyaptiya horage ide. Dayavittu nimma Krishi Sevaka annu samparkinisi.",
  "mr-IN": "Hya prashnaacha uttara dene mazhya karyakshetrat nahi. Krupaya tumchya Krishi Sewak shi sampark sadha.",
  "ta-IN": "Indha kelvi en ellaiku apparpaattadhu. Thayavu seidhu ungal Krishi Sewak ai thodarbu kollungal.",
  "bn-IN": "Ei proshno amar parisimar baire. Dayakore apnar Krishi Sewak er sathe jogajog korun.",
  "gu-IN": "Aa prashn mari hadh bahar chhe. Maherbani kari tamara Krishi Sewak no sampark karo.",
  "pa-IN": "Eh sawal mere daaire ton bahar hai. Kirpa karke apne Krishi Sewak naal sampark karo.",
  "ml-IN": "Ee chodyam ente paridhi-yil alla. Dayavayi ningalude Krishi Sewak-ne samparkkukuka.",
  "od-IN": "Ei prashna mo parisima bahare. Dayakari apananka Krishi Sewak nka saha jogajoga karantu.",
};

// ── Safety warning templates ─────────────────────────────────────────────────

const SAFETY_WARNINGS: Record<string, string> = {
  "hi-IN": "Card mein recommend ki gayi matra se zyada dalna fasal ko nuksan kar sakta hai.",
  "bho-IN": "Card mein recommend ki gayi matra se zyada dalna fasal ko nuksan kar sakta hai.",
  "te-IN": "Card lo suggest chesina danikantte ekkuva vestey pantalaku haani kaligisthundi.",
  "kn-IN": "Card nalli shifarasu madidakkinta hechchu haakidare belege haani aagabahudhu.",
  "mr-IN": "Card madhye shiFarish keleli matra petaksha aadhik vaparlyaas pikaala nukasan houh shakate.",
  "ta-IN": "Card-il parindhuraikkappatta alavu-kkum athigamaga pottaal payirukku seetham varum.",
  "bn-IN": "Card-e suggest kora poriman theke beshi dile phasaler khoti hote pare.",
  "gu-IN": "Card ma suggest kareli matra thi vadhu vaparva thi paak ne nuksan thai shake chhe.",
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Pre-LLM: scan farmer transcript for jailbreak/manipulation attempts.
 * Returns { clean, flagged }. If flagged=true, caller should skip LLM and use getCannedDeflection().
 */
export function sanitizeInput(transcript: string): { clean: string; flagged: boolean } {
  const text = transcript.trim();
  if (!text) return { clean: "", flagged: false };

  for (const pattern of JAILBREAK_PATTERNS) {
    if (pattern.test(text)) {
      console.log("[guardrails] jailbreak detected, pattern:", pattern.source);
      return { clean: "", flagged: true };
    }
  }

  return { clean: text, flagged: false };
}

/**
 * Post-LLM: validate and clean the LLM output.
 * Returns { clean, flags } where flags records what was triggered.
 */
export function validateOutput(
  text: string,
  ctx: SessionContext,
): { clean: string; flags: string[] } {
  const flags: string[] = [];
  let output = text.trim();

  if (!output) {
    return { clean: getCannedDeflection(ctx.session.language_code), flags: ["empty_output"] };
  }

  // 1. Sentence truncation (max 3 sentences)
  output = truncateSentences(output, 3, flags);

  // 2. Forbidden topic detection
  const forbidden = detectForbiddenTopic(output);
  if (forbidden) {
    flags.push(`forbidden_topic_leak:${forbidden}`);
    return { clean: getCannedDeflection(ctx.session.language_code), flags };
  }

  // 3. English leak detection
  const englishRatio = computeEnglishRatio(output);
  if (englishRatio > 0.20) {
    flags.push("english_leak");
    // Don't replace — just flag. Code-mixed speech is common.
  }

  // 4. Over-application safety check
  output = checkOverApplication(output, ctx, flags);

  return { clean: output, flags };
}

/**
 * Returns a canned deflection response in the farmer's language.
 */
export function getCannedDeflection(languageCode: string): string {
  return CANNED_DEFLECTIONS[languageCode] ?? CANNED_DEFLECTIONS["hi-IN"];
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/** Split text into sentences and keep at most `max`. */
export function truncateSentences(text: string, max: number, flags: string[]): string {
  // Split on Hindi purna viram (।), period, question mark, exclamation
  const sentences = text
    .split(/(?<=[।.?!])\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length > max) {
    flags.push("truncated");
    return sentences.slice(0, max).join(" ");
  }
  return text;
}

/** Check if the output mentions any forbidden topic. */
export function detectForbiddenTopic(text: string): string | null {
  for (const category of FORBIDDEN_TOPICS) {
    for (const pattern of category.patterns) {
      if (pattern.test(text)) {
        return category.name;
      }
    }
  }
  return null;
}

/** Compute the fraction of words that are Latin-script and not in the whitelist. */
export function computeEnglishRatio(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 0;

  let englishCount = 0;
  for (const word of words) {
    // Strip punctuation for matching
    const clean = word.replace(/[.,!?;:।'"()[\]{}]/g, "").toLowerCase();
    if (!clean) continue;
    // Check if the word is Latin-script (ASCII letters)
    if (/^[a-z0-9\-/]+$/i.test(clean)) {
      if (!ENGLISH_WHITELIST.has(clean)) {
        englishCount++;
      }
    }
  }

  return englishCount / words.length;
}

/** Check if the output mentions quantities >2x the per-acre recommendation without a warning. */
export function checkOverApplication(
  text: string,
  ctx: SessionContext,
  flags: string[],
): string {
  const rec = ctx.recommendations.per_acre;

  // Map fertilizer names/aliases to their per-acre limits
  const fertilizerContexts: { patterns: RegExp; limit: number }[] = [
    { patterns: /urea/i, limit: rec.urea_kg * 2 },
    { patterns: /dap|ssp|phosphate|phosphat/i, limit: rec.primary_phosphate_kg * 2 },
    { patterns: /potash|mop|potaash/i, limit: rec.potash_kg * 2 },
  ];

  const warningPhrases = /zyada|nuksan|card\s+mein|recommend|adhik|haani|nukasan|seetham|khoti/i;
  const hasWarning = warningPhrases.test(text);
  if (hasWarning) return text;

  // Find all number+context pairs: look for numbers near fertilizer names
  // Pattern: number followed by "kilo/kg" and a fertilizer name within ~40 chars
  const numberMatches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:kilo|kg)?\b/gi)];

  for (const match of numberMatches) {
    const num = Number(match[1]);
    const pos = match.index ?? 0;
    // Look at surrounding context (40 chars before and after the number)
    const contextWindow = text.slice(Math.max(0, pos - 40), Math.min(text.length, pos + match[0].length + 40));

    for (const fert of fertilizerContexts) {
      if (fert.limit <= 0) continue;
      if (fert.patterns.test(contextWindow) && num > fert.limit) {
        flags.push("safety_warning_appended");
        const lang = ctx.session.language_code;
        const warning = SAFETY_WARNINGS[lang] ?? SAFETY_WARNINGS["hi-IN"];
        return text + " " + warning;
      }
    }
  }

  // Fallback: if any number is extremely high (>3x the max recommendation) without
  // any fertilizer context, still warn — this catches generic "500 kilo daalein" style
  const maxRec = Math.max(rec.urea_kg, rec.primary_phosphate_kg, rec.potash_kg);
  const extremeThreshold = maxRec * 3;
  for (const match of numberMatches) {
    const num = Number(match[1]);
    if (num > extremeThreshold) {
      flags.push("safety_warning_appended");
      const lang = ctx.session.language_code;
      const warning = SAFETY_WARNINGS[lang] ?? SAFETY_WARNINGS["hi-IN"];
      return text + " " + warning;
    }
  }

  return text;
}
