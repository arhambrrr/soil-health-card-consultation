// Unit normalization for old-format SHC cards.
// All area units are normalized to acres.

export type AreaUnit = "decimal" | "acre" | "hectare" | "guntha" | "gunta" | "cent";

const UNIT_TO_ACRE: Record<AreaUnit, number> = {
  decimal: 0.01,
  acre: 1,
  hectare: 2.471,
  guntha: 0.025,
  gunta: 0.025,
  cent: 0.01,
};

export function detectUnit(label: string): AreaUnit {
  const l = label.toLowerCase().trim();
  if (l.includes("hectare") || l === "ha") return "hectare";
  if (l.includes("guntha") || l.includes("gunta")) return "guntha";
  if (l.includes("cent")) return "cent";
  if (l.includes("acre")) return "acre";
  // Decimal is most common in Bihar/UP/Bengal — default fallback
  return "decimal";
}

export function toAcres(value: number, unit: AreaUnit): number {
  return +(value * UNIT_TO_ACRE[unit]).toFixed(3);
}

export function perAcre(totalQuantity: number, plotAreaAcres: number): number {
  if (plotAreaAcres <= 0) return 0;
  return +( totalQuantity / plotAreaAcres).toFixed(1);
}

// Midpoint of a range string like "5-10" or "5.0-10.0"
export function rangeMidpoint(rangeStr: string): number {
  const parts = rangeStr.split("-").map((s) => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return +((parts[0] + parts[1]) / 2).toFixed(1);
  }
  const single = parseFloat(rangeStr);
  return isNaN(single) ? 0 : single;
}
