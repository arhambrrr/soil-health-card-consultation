# CLAUDE.md — SHC Conversational Consultation System

## What This Project Is

A web application for Indian CSC (Common Service Centre) operators to help farmers understand their Soil Health Cards (SHC). The operator photographs the farmer's physical SHC, the system extracts the data using Sarvam Vision OCR, and then conducts a live voice conversation with the farmer in their own language and dialect using Sarvam's STT (Saaras) and TTS (Bulbul) models.

This solves a documented problem: 67% of Indian farmers cannot understand their Soil Health Card even after the government redesigned it (IDinsight RCT, 2021). Generic audio explanations were proven not to work. Card-specific, dialect-specific, conversational explanation is what moves the needle.

The product is B2G — the customer is the CSC operator or the government body funding CSCs, not the farmer directly.

---

## Sarvam AI APIs (Primary External Dependency)

All Sarvam APIs are free during February 2026. Sign up at sarvam.ai to get API keys.

**Base URL:** `https://api.sarvam.ai`

**Models in use:**
- `sarvam-vision` — Document OCR and extraction (free all of February 2026)
- `saaras-v2` — Speech-to-text, 22 Indian languages, streaming supported
- `bulbul-v3` — Text-to-speech, 11 Indian languages, 35+ voices (free all of February 2026)
- Sarvam LLM (Indic-optimized) — for the conversation agent layer

**Authentication:** `api-subscription-key` header on all requests.

**Document Intelligence endpoint:**
```
POST /v1/vision/document
Content-Type: multipart/form-data
Body: { file: <image>, prompt: <extraction prompt> }
```

**TTS endpoint:**
```
POST /v1/text-to-speech
Body: { text, target_language_code, speaker, model: "bulbul:v3" }
```

**STT endpoint:**
```
POST /v1/speech-to-text
Body: { file: <audio>, language_code, model: "saaras:v2" }
```

Refer to `docs.sarvam.ai` for full API reference. Do not hardcode API keys — use environment variables.

---

## System Architecture: Three Phases

### Phase 1: Intake (Operator-driven)
Operator selects three things before uploading:
1. Language + dialect (dropdown)
2. Fertilizer type: DAP or SSP
3. Crop this season (state-specific dropdown)

Operator then photographs and uploads the SHC image. These three inputs seed all subsequent phases.

### Phase 2: Extraction Pipeline
Two-branch pipeline depending on card format.

**Gate 0: Format Detection**
Single Vision API call. Prompt asks only: does this card contain visual illustrations of fertilizer bags (sacks drawn as images)? Returns `FORMAT_NEW` or `FORMAT_OLD`. Routes to Branch A or Branch B.

**Branch A: New Format (post-April 2023)**
- Single-pass extraction: all 12 parameters + status flags + right-panel fertilizer recommendation table (crop → urea/DAP-SSP/potash in kg per acre)
- Lightweight interpretation: identify top 2-3 deficiencies, select relevant crop row, check card expiry
- Output: Session Context JSON

**Branch B: Old Format (pre-2023)**
- Two-pass extraction:
  - Pass 1: farmer details, plot area + unit, 12 parameters + निष्कर्ष (status)
  - Pass 2: focused extraction of the recommendation table — both Anushansa 1 (DAP) and Anushansa 2 (SSP) rows per crop in kg
- Normalization layer:
  - Convert per-holding quantities to per-acre (plot area in Decimals → acres: divide by 100)
  - Select Anushansa 1 or 2 based on operator's fertilizer type selection from Phase 1
  - Micronutrient ranges: take midpoint, flag as approximate
- Heavier interpretation: priority rank deficiencies by crop type, flag anomalies, check card age
- Output: Session Context JSON

**Session Context JSON (output of Phase 2, persists through Phase 3):**
```json
{
  "farmer": {
    "name": "",
    "village": "",
    "district": "",
    "plot_area_acres": 0.0,
    "card_format": "OLD|NEW",
    "card_cycle": "",
    "card_expired": false
  },
  "soil": {
    "pH": { "value": 0.0, "status": "low|normal|high", "normal_range": "" },
    "EC": { "value": 0.0, "status": "" },
    "OC": { "value": 0.0, "status": "" },
    "N":  { "value": 0.0, "status": "" },
    "P":  { "value": 0.0, "status": "" },
    "K":  { "value": 0.0, "status": "" },
    "S":  { "value": 0.0, "status": "" },
    "Zn": { "value": 0.0, "status": "" },
    "B":  { "value": 0.0, "status": "" },
    "Fe": { "value": 0.0, "status": "" },
    "Mn": { "value": 0.0, "status": "" },
    "Cu": { "value": 0.0, "status": "" }
  },
  "recommendations": {
    "fertilizer_type": "DAP|SSP",
    "selected_crop": "",
    "per_acre": {
      "urea_kg": 0,
      "primary_phosphate_kg": 0,
      "potash_kg": 0
    },
    "micronutrients": {
      "zinc_sulphate_kg_approximate": 0,
      "other": []
    },
    "priority_deficiencies": []
  },
  "session": {
    "language_code": "",
    "dialect": "",
    "crop": "",
    "fertilizer_type": ""
  }
}
```

### Phase 3: Consultation Loop
Voice conversation grounded in the Session Context.

**Opening turn:** System-generated, template-based (not LLM). Bulbul speaks a 3-sentence summary: top deficiencies, per-acre fertilizer quantities for selected crop, invitation to ask questions.

**Conversation loop:** Farmer speaks → Saaras STT → LLM with Session Context → Bulbul TTS → repeat.

**Loop ends** when operator clicks End Session button.

**Post-session:** Log full transcript. Optionally generate and print a simplified summary card in the farmer's language (top quantities only, one page).

---

## LLM Agent Rules (Enforce These in the System Prompt)

The LLM is the conversation agent in Phase 3. Its system prompt must enforce:

1. **Scope:** Only answer questions grounded in the Session Context JSON or the embedded agronomic knowledge base. Do not provide general agricultural advice.
2. **Length:** Maximum 3 sentences per response. This is voice output.
3. **Units:** Always include units. Never say "93" — say "93 kilo urea".
4. **No contradiction:** Never contradict values in the Session Context.
5. **Quantity scaling:** If farmer asks for a different area than the card, calculate and state clearly: "Aapke 5 acre ke liye, [X] kilo urea chahiye."
6. **Language:** Respond only in the dialect specified in `session.language_code` and `session.dialect`. Never switch to English mid-response.
7. **Deflection:** If the question is outside scope (pests, diseases, market prices, other farmers' land), respond with: "Yeh sawaal aapke Krishi Sewak ke liye behtar hoga." Do not attempt to answer.
8. **Safe limits:** If farmer indicates they want to apply significantly more than recommended, flag this: "Card mein [X] kilo recommend kiya gaya hai — zyada dalna fasal ko nuksan kar sakta hai."
9. **No open-ended follow-up after first turn:** Ask "Koi aur sawaal hai?" only once at the very start. After that, just answer and stop.

**Intent categories the LLM should handle:**
- **Clarification** — explaining what a term or deficiency means
- **Quantity adjustment** — recalculating for a different area or split schedule
- **Application guidance** — timing, method, basal vs top-dress splits
- **Out of scope** — deflect

---

## Agronomic Knowledge Base

Embed this as static text in the LLM system prompt. Do not make it dynamic. An agronomist should review this before production.

**Urea application splits by crop:**
- Paddy (Dhan): 1/3 basal at transplanting, 1/3 at tillering (25-30 days), 1/3 at panicle initiation (45-50 days)
- Wheat (Gehun): 1/2 basal at sowing, 1/2 at first irrigation (21 days)
- Maize (Makka): 1/3 basal, 1/3 at knee-height stage, 1/3 at tasseling
- Cotton: 1/4 basal, 3/4 split across 30, 60, 90 days
- Mustard (Sarson): Full dose basal at sowing
- Pulses (Dalen): Half dose only, basal — pulses fix their own nitrogen

**What deficiency looks like in the field (for farmer self-verification):**
- Nitrogen deficiency: yellowing starting from older/lower leaves upward
- Phosphorus deficiency: purple/reddish tint on leaves, stunted roots
- Zinc deficiency: white/pale streaks between leaf veins on young leaves, stunted new growth
- Low OC (Organic Carbon): soil crusting after rain, poor water retention

**DAP vs SSP equivalence (if farmer asks):**
DAP (18:46:00) is more concentrated — you need less of it. SSP (16% P) requires more quantity for the same phosphorus. The card calculates the right amount for whichever type the farmer uses — do not mix recommendations across types.

**Zinc note:** Zinc sulphate comes in 33% (monohydrate) and 21% (heptahydrate) forms. Pack sizes vary by local dealer (5 kg, 10 kg, 25 kg). Do not give a bag count — give kg quantity only and tell farmer to ask their dealer.

---

## Card Format Details

### New Format (post-April 2023)
- Foldable format, color-coded (green = sufficient, red/orange = deficient)
- Left panel: 12 parameters with measured value, normal range, status badge
- Right panel: fertilizer recommendation table with crop columns and fertilizer bag illustrations
- Recommendations already in kg/acre — no conversion needed
- May have separate DAP and SSP tables — extract both, use the one matching operator's selection
- Has QR code linking to additional info

### Old Format (pre-2023)
- Single large page (farmers folded it, causing creases — a known OCR challenge)
- Top section: farmer details, lab name, sample ID, GPS coordinates, plot area in Decimals
- Middle-right: 12-parameter table with columns: parameter, value, मानक (normal range), निष्कर्ष/स्तर (status)
- Bottom-right: fertilizer recommendation table — nested, per-holding area (not per acre), dual Anushansa columns
- Bottom-left: micronutrient and organic manure recommendations (ranges, not single values)
- Footnotes at bottom — extract these too, they contain important caveats

**Critical old-format extraction note:** The dual Anushansa table has merged header cells. Anushansa 1 = DAP-based (columns: Urea, DAP 18:46:00, Potash MOP 60). Anushansa 2 = SSP-based (columns: Urea, SSP 16, Potash MOP 60). These are side by side. This is the highest-risk extraction element — validate it carefully.

---

## Language and Dialect Support

Supported combinations for Phase 1 dropdown. Language codes follow BCP-47.

| Language | Dialect | Code |
|----------|---------|------|
| Hindi | Standard | hi-IN |
| Hindi | Bhojpuri | bho-IN |
| Hindi | Avadhi | hi-IN (closest) |
| Telugu | Standard | te-IN |
| Telugu | Telangana | te-IN |
| Kannada | Standard | kn-IN |
| Marathi | Standard | mr-IN |
| Tamil | Standard | ta-IN |
| Bengali | Standard | bn-IN |
| Gujarati | Standard | gu-IN |

Verify Bulbul V3's exact supported language codes against `docs.sarvam.ai` before building the dropdown — the list above is approximate.

---

## State-Specific Crop Dropdowns

Show only crops relevant to the state. Do not show a single global crop list.

| State | Primary Crops |
|-------|--------------|
| Bihar, UP | Paddy, Wheat, Maize, Mustard, Pulses, Potato |
| Karnataka | Paddy, Ragi, Jowar, Cotton, Groundnut, Sunflower |
| Andhra Pradesh, Telangana | Paddy, Cotton, Maize, Chilli, Groundnut |
| Maharashtra | Cotton, Soybean, Jowar, Tur, Wheat |
| Tamil Nadu | Paddy, Sugarcane, Groundnut, Maize, Banana |
| Punjab, Haryana | Wheat, Paddy, Maize, Cotton, Mustard |

State is inferred from the district on the card (extracted in Phase 2) — but the operator should also be able to manually override if needed.

---

## Fertilizer Conversion Reference

For the interpretation layer and LLM knowledge base.

**Macronutrient content of standard fertilizers:**
- Urea: 46% N → 1 kg urea provides 0.46 kg N
- DAP (18:46:00): 18% N, 46% P₂O₅ → standard 50 kg bag
- SSP (Single Super Phosphate 16%): 16% P₂O₅ → 50 kg bag
- MOP / Potash (60%): 60% K₂O → standard 50 kg bag
- Urea: 45 kg bag, MRP ₹242 fixed (unchanged since 2018)

**Do not convert to bag counts for micronutrients** — pack sizes vary by local dealer and product form (monohydrate vs heptahydrate). Give kg quantities only.

**Do not convert macronutrient bag counts in the old card branch** — the government portal has already done this calculation correctly. Trust the card's recommendation numbers; just normalize per-acre.

---

## Unit Normalization Rules (Branch B Only)

Old cards express plot area and recommendations in different units by state:

- **Decimal:** 1 Decimal = 0.01 acre (most common in Bihar, UP, Bengal)
- **Acre:** No conversion needed
- **Hectare:** 1 hectare = 2.471 acres
- **Guntha/Gunta:** 1 Guntha = 0.025 acre (used in Karnataka, Maharashtra)
- **Cent:** 1 Cent = 0.01 acre (used in Tamil Nadu, Kerala — same as Decimal)

Detect the unit from the card's area field label, normalize everything to acres before storing in Session Context.

---

## Frontend: Web Application

Technology: Simple web app. Use whatever stack you're comfortable with. Runs in-browser at the CSC counter on a standard computer. No mobile-first requirement — CSCs have desktops.

**Key UI requirements:**
- Phase 1 intake form: language dropdown, fertilizer type toggle (DAP/SSP), crop dropdown — all required before upload button activates
- Image upload with quality check: warn operator if image is too dark, too blurry, or partial before sending to API
- Loading state during Phase 2 extraction: show progress — "Reading card... Extracting data... Preparing consultation"
- Phase 3 interface: large, clean. Show farmer name and selected crop prominently. Show a microphone indicator when system is listening. Show transcript of current exchange so operator can follow along and intervene if needed.
- End Session button: prominent, always visible during Phase 3
- Optional print button at end: generates simplified summary for farmer to take home

**Accessibility note:** The operator uses this app, not the farmer. Design for a VLE (Village Level Entrepreneur) who is educated and computer-literate but may not be a developer. UI text should be in English (the operator's working language for government portals).

---

## Data and Logging

Log every session:
```json
{
  "session_id": "uuid",
  "timestamp": "ISO8601",
  "operator_csc_id": "",
  "card_format_detected": "OLD|NEW",
  "district": "",
  "state": "",
  "language": "",
  "crop": "",
  "fertilizer_type": "",
  "priority_deficiencies": [],
  "conversation_turns": 0,
  "deflections": 0,
  "transcript": [],
  "extraction_confidence": "HIGH|MEDIUM|LOW"
}
```

Do not log farmer Aadhaar numbers or mobile numbers — these are visible on the card but must be masked before storage. Log district-level location only, not GPS or village-level for privacy.

---

## What to Build First

Validate in this order before building the full system:

1. **Vision extraction test** — Take 5-10 SHC images (mix of old and new, mix of states and languages). Run each through Sarvam Vision with your extraction prompt. Check: does it correctly identify the 12 parameter values? Does it correctly parse the nested recommendation table on old cards? This is your highest-risk unknown. Do this before writing any other code.

2. **Gate 0 format detection** — Test the binary classifier on your image set. Should be near-perfect — the visual difference between old and new is very clear.

3. **Session Context construction** — Write the normalization logic and verify the JSON output looks correct for both card formats.

4. **Bulbul TTS** — Test the opening summary template in 2-3 languages. Verify audio quality and naturalness.

5. **Saaras STT** — Test with voice recordings of common farmer questions in Hindi and Telugu. Check transcription accuracy.

6. **LLM conversation loop** — Wire Saaras → LLM → Bulbul. Test with the Session Context from step 3. Verify the agent stays in scope and respects the 3-sentence limit.

7. **Full integration** — Connect all phases end to end with the web UI.

---

## Environment Variables Required

```
SARVAM_API_KEY=
```

Do not commit this to version control. Use a `.env` file locally.

---

## Key External References

- Sarvam API docs: https://docs.sarvam.ai
- Sarvam pricing (February free tier confirmed): https://docs.sarvam.ai/api-reference-docs/getting-started/pricing
- SHC portal (for test images): https://soilhealth.dac.gov.in — Farmer's Corner → Print Soil Health Card
- SHC old format reference (Bihar): the Bihar farmer card image in project assets
- SHC new format reference: the redesigned card diagram in project assets
- IDinsight RCT (comprehension evidence): https://www.idinsight.org/project/improving-indias-soil-health-card-scheme-and-agricultural-markets/
