// --- WSD v1.2 Framework Types ---

export interface LayerDimension {
  name: string;
  score: number; // 0-100
  reasoning: string;
}

export interface WSDLayer {
  name: "POLICY" | "HIDDEN" | "DIGNITY";
  label: string;
  score: number; // 0-100 (weighted composite)
  dimensions: LayerDimension[];
  explanation: string;
  signal: string;
}

export interface AnalysisResult {
  // Verdict
  verdict: string;
  verdictColor: string;
  oneLine: string;

  // Scores
  wsdScore: number;
  confidenceBand: number; // ±8, ±15, or ±22
  confidenceLevel: "high" | "medium" | "low";
  designIntegrity: number;
  designIntegrityNote: string;

  // Archetype
  archetype: string;
  archetypeName: string;
  archetypeReason: string;
  cascadeBeneficiary: string | null;
  genderFlag: string | null;

  // Layers
  layers: WSDLayer[];

  // Narrative
  hiddenCost: string;
  hiddenCostHeadline: string;
  whatNumbersMiss: string;
  shareLine: string;

  // Share
  shareSignature: string;

  // null = not a scheme
  score: number | null;
}

export type AppState = "idle" | "analyzing" | "result" | "not-a-scheme" | "error" | "rate-limited";
