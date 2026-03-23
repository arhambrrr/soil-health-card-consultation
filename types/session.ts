export type CardFormat = "OLD" | "NEW";
export type FertilizerType = "DAP" | "SSP";
export type SoilStatus = "low" | "normal" | "high" | string;

export interface SoilParameter {
  value: number | null;
  status: SoilStatus;
  normal_range?: string;
}

export interface SessionContext {
  farmer: {
    name: string;
    village: string;
    district: string;
    plot_area_acres: number;
    card_format: CardFormat;
    card_cycle: string;
    card_expired: boolean;
  };
  soil: {
    pH: SoilParameter;
    EC: SoilParameter;
    OC: SoilParameter;
    N: SoilParameter;
    P: SoilParameter;
    K: SoilParameter;
    S: SoilParameter;
    Zn: SoilParameter;
    B: SoilParameter;
    Fe: SoilParameter;
    Mn: SoilParameter;
    Cu: SoilParameter;
  };
  recommendations: {
    fertilizer_type: FertilizerType;
    selected_crop: string;
    per_acre: {
      urea_kg: number;
      primary_phosphate_kg: number;
      potash_kg: number;
    };
    micronutrients: {
      zinc_sulphate_kg_approximate?: number;
      other: string[];
    };
    priority_deficiencies: string[];
  };
  session: {
    language_code: string;
    dialect: string;
    crop: string;
    fertilizer_type: FertilizerType;
  };
}

export interface ConversationTurn {
  role: "system" | "farmer";
  text: string;
  timestamp: string;
  flags?: string[];
}

export interface SessionLog {
  session_id: string;
  timestamp: string;
  operator_csc_id: string;
  card_format_detected: CardFormat;
  district: string;
  state: string;
  language: string;
  crop: string;
  fertilizer_type: FertilizerType;
  priority_deficiencies: string[];
  conversation_turns: number;
  deflections: number;
  transcript: ConversationTurn[];
  extraction_confidence: "HIGH" | "MEDIUM" | "LOW";
}
