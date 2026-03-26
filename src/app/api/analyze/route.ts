import { NextRequest, NextResponse } from "next/server";
import { AnthropicBedrock } from "@anthropic-ai/bedrock-sdk";
import { z } from "zod";
import { createHmac } from "crypto";

// --- Zod schemas for WSD v1.4 ---

const InputSchema = z.object({
  scheme: z.string().min(1, "Scheme text is required").max(300, "Scheme text must be 300 characters or less"),
});

const DimensionSchema = z.object({
  name: z.string().min(1),
  score: z.number().min(-1).max(100),
  reasoning: z.string().min(1),
});

const LayerSchema = z.object({
  name: z.enum(["POLICY", "HIDDEN", "DIGNITY"]),
  label: z.string().min(1),
  dimensions: z.array(DimensionSchema),
  explanation: z.string().min(1),
  signal: z.string().min(1),
});

const WSDOutputSchema = z.object({
  freebieAnswer: z.enum(["Yes", "No", "It's complicated"]),
  freebieShort: z.string().min(1),
  archetype: z.enum(["A", "B", "C", "D", "E", "F"]),
  archetypeName: z.string().min(1),
  archetypeReason: z.string().min(1),
  marketFailureType: z.enum(["M1", "M2", "M3", "M4"]),
  marketFailureTypeName: z.string().min(1),
  incidenceFlag: z.string().nullable(),
  cascadeBeneficiary: z.string().nullable(),
  genderFlag: z.string().nullable(),
  confidenceLevel: z.enum(["high", "medium", "low"]),
  layers: z.array(LayerSchema).length(3),
  designIntegrity: z.number().min(0).max(100),
  designIntegrityNote: z.string().min(1),
  hiddenCost: z.string().min(1),
  hiddenCostHeadline: z.string().min(1),
  whatNumbersMiss: z.string().min(1),
  oneLine: z.string().min(1),
  shareLine: z.string().min(1),
});

// --- Cloudflare Turnstile verification ---

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET || "";

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true; // Skip in dev when no secret configured
  if (!token) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET,
        response: token,
        remoteip: ip,
      }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

// --- Rate limiting ---

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// --- Verdict logic (v1.4 — 6 verdicts, WSD × DI) ---

interface VerdictResult {
  label: string;
  color: string;
}

function assignVerdict(wsdScore: number, designIntegrity: number, policyTargeting: number): VerdictResult {
  // Override: reaches poorest sub-score <30 → max "Looks good on paper"
  if (policyTargeting < 30 && wsdScore >= 72) {
    return { label: "Looks good on paper", color: "#F59E0B" };
  }
  if (wsdScore >= 72 && designIntegrity >= 60) {
    return { label: "Genuine uplift", color: "#22C55E" };
  }
  if (wsdScore >= 72 && designIntegrity < 60) {
    return { label: "Works despite itself", color: "#84CC16" };
  }
  if (wsdScore >= 52 && wsdScore <= 71 && designIntegrity >= 60) {
    return { label: "Solid — watch the outcomes", color: "#3B82F6" };
  }
  if (wsdScore >= 52 && wsdScore <= 71 && designIntegrity < 60) {
    return { label: "Looks good on paper", color: "#F59E0B" };
  }
  if (wsdScore < 52 && designIntegrity < 35) {
    return { label: "Designed to be seen, not to work", color: "#EF4444" };
  }
  return { label: "Well-meaning dud", color: "#F97316" };
}

// --- HMAC signing ---

function signResult(wsdScore: number, designIntegrity: number): string {
  const secret = process.env.SHARE_SECRET;
  if (!secret) return "";
  const payload = `${wsdScore}:${designIntegrity}`;
  return createHmac("sha256", secret).update(payload).digest("hex").slice(0, 32);
}

// --- System prompt (WSD v1.4) ---

const SYSTEM_PROMPT = `You are the analysis engine for 'Is It A Freebie?' — scoring government schemes using the Welfare State Delta (WSD) framework v1.4.

BEFORE SCORING — MANDATORY:
1. Name the specific scheme, state, and year. Disambiguate from similar schemes in other states before touching any numbers. Evidence from another state's version of the same idea cannot affect this scheme's score.
2. Identify all arms of the scheme. Score separately if arms differ significantly in type, then average.
3. If ANY competitive exam component exists (UPSC, JEE, NEET, TNPSC, CAT, CLAT, state civil services): search for declared results before scoring. Failure to find them is a data error.
4. Search for recent developments (last 12 months).

CLASSIFY TWO AXES BEFORE SCORING:

Archetype (sets dignity locus question):
  A (physical asset): "Did it arrive at home?" Default locus 90.
  B (credential): "Did it remove a human gatekeeper?" Default 45.
  C (infrastructure): "Did it end a daily physical hardship?" Default 85.
  D (cash): "Did it end a dependency relationship?" Default 35.
  E (service access): "Did it change participation terms in a public institution?" Default 65-75.
  F (competitive pathway): "Did it open a class-restricted pathway to a specific group?" Default 80-90 when outcomes verified.

Market Failure Type (sets multiplier):
  M1 — Merit good with externalities. Multiplier 1.5× (modelled) or 1.75× (third-party verified).
  M2 — Market failure correction. Multiplier 1.5× (modelled) or 1.75× (verified).
  M3 — Pure redistribution. No externality. Multiplier 1.0-1.2×.
  M4 — Untargeted non-merit transfer. Multiplier 0.7-0.9×. Regressive or universal distribution.
  Note: M3 ≠ M4. A well-targeted redistribution scheme with no externality is M3, not M4.

FORMULA: Overall = (POLICY × HIDDEN × DIGNITY)^(1/3) × 100
Floor: any layer < 0.25 caps overall at 40.
Confidence: High ±8 (third-party verified/peer review), Medium ±15, Low ±22.

POLICY LAYER (0-100): Fiscal health 25% / Reaches poorest 40% / Long-term impact chain 35% (multiplier applied here).
  Multiplier reference by Market Failure Type:
    M1 — Merit good, modelled chain: 1.5×
    M1/M2 — Third-party verified outcomes: 1.75×
    M2 — Market failure, modelled chain: 1.5×
    M3 — Pure redistribution, durable asset: 1.2×
    M3 — Pure redistribution, consumption: 1.0×
    M4 — Untargeted, non-merit: 0.7–0.9×
  Producer/consumer incidence: score targeting from actual beneficiary perspective, not budget classification.

HIDDEN COST LAYER (0-100): Workaround severity 35% / Power disrupted 30% / Benefit lasts 20% / Can be cancelled 15% (INVERTED).
  MONETARY FLOOR CHECK: if recurring workaround cost > 3% of daily wages, workaround severity minimum 75.
  Cancellability scores: physical asset 95, infrastructure 80, legislation 70, institutionalised agency 55, budget line 35, electoral promise 15.
  This layer operates independently of Market Failure Type. An M3 scheme can score just as high here as M1 if the workaround was equally severe.

DIGNITY LAYER (0-100): Changed standing 40% (archetype-specific) / Reaction 35% / Language/identity shift 25%.
  This layer also operates independently of Market Failure Type.

DESIGN INTEGRITY (start 50, parallel to WSD, only affects verdict label):
  +25 third-party verified outcomes, +20 opposition continued, +15 independent eval published,
  +15 need-indexed rollout, +10 needs-based amount, +10 implementation plan published.
  -20 no monitoring, -20 constituency rollout, -15 fanfare no plan, -10 heavy branding, -10 round number.
  NOT scored: manifesto timing, implementation speed, scheme named after leader.

VERDICTS: WSD≥72+DI≥60=Genuine uplift | WSD≥72+DI<60=Works despite itself |
  WSD52-71+DI≥60=Solid-watch outcomes | WSD52-71+DI<60=Looks good on paper |
  WSD<52+DI<35=Designed to be seen | WSD<52+DI≥35=Well-meaning dud
  Override: targeting <30 → max 'Looks good on paper'

FLAGS:
  Cascade beneficiary: name them if their transformation is larger than the direct recipient's.
  Gender flag: name the gendered workaround if women disproportionately bore it.

OUTPUT (plain English, no acronyms):
0. FREEBIE ANSWER: "Yes", "No", or "It's complicated" — directly answers "Is [scheme] a freebie?"
   freebieShort: max 60 chars explaining why
1. VERDICT | Overall: [n±band] | DI: [n] | Confidence: [level]
2. ONE LINE: max 80 chars, no jargon, should provoke a reaction
3. SCHEME TYPE: [Archetype+name] + [M-type+name] | [one sentence] | [cascade] | [gender] | [incidence if applies]
4. POLICY [n/100]: 1 sentence + sub-scores. | Sub: Fiscal [n] / Reaches poorest [n] / Long-term [n] | Multiplier: [type+rate] | Signal: [fact+source]
5. HIDDEN COST [n/100]: 1 sentence + sub-scores. | Sub: Workaround [n] / Power [n] / Lasts [n] / Cancellable [n] | Signal: [the workaround, named]
6. DIGNITY [n/100]: 1 sentence + sub-scores. | Sub: Standing [n] / Reaction [n] / Language [n] | Signal: [proxy]
7. THE HIDDEN COST: max 75 words — specific, named, concrete
8. WHAT THE NUMBERS MISS: max 50 words
9. DESIGN INTEGRITY NOTE: 1-2 sentences on specific signals
10. SHARE LINE: must start with "Is [scheme name] a freebie? [Yes/No/It's complicated]." then max 160 more chars with hashtag.

OUTPUT RULES:
- BREVITY IS PARAMOUNT. Every sentence must earn its place. Cut filler ruthlessly.
- Be SPECIFIC — real data, budget figures, beneficiary counts. But say it in fewer words.
- Each dimension reasoning: 1 sentence with specific evidence. NO padding.
- hiddenCost: max 75 words. What did people DO before? Name it concretely.
- hiddenCostHeadline: punchy headline, max 50 chars.
- whatNumbersMiss: max 50 words.
- oneLine: max 80 chars. Punchy.
- If input is not a recognizable government policy/scheme, return ALL dimension scores as -1.
- designIntegrityNote: 1-2 sentences naming specific signals.
- TONE: Write for a politically aware Indian social media audience. Honest. Respects the people the scheme serves. Electoral democracy producing welfare programmes is not a design failure.`;

const TOOL_DEFINITION = {
  name: "analyze_scheme_wsd",
  description: "Analyze a government scheme using WSD v1.4 framework",
  input_schema: {
    type: "object" as const,
    properties: {
      freebieAnswer: {
        type: "string",
        enum: ["Yes", "No", "It's complicated"],
        description: "Direct answer to 'Is it a freebie?'",
      },
      freebieShort: {
        type: "string",
        description: "Max 60 chars — one-line reason for the freebie answer",
      },
      archetype: {
        type: "string",
        enum: ["A", "B", "C", "D", "E", "F"],
      },
      archetypeName: { type: "string" },
      archetypeReason: { type: "string" },
      marketFailureType: {
        type: "string",
        enum: ["M1", "M2", "M3", "M4"],
        description: "Market Failure Type: M1=merit good, M2=market failure correction, M3=pure redistribution, M4=untargeted non-merit",
      },
      marketFailureTypeName: {
        type: "string",
        description: "Plain name for the market failure type (e.g. 'Merit good with externalities', 'Pure redistribution')",
      },
      incidenceFlag: {
        type: ["string", "null"] as unknown as "string",
        description: "Producer/consumer incidence note if budget classification differs from actual beneficiary. null if not applicable.",
      },
      cascadeBeneficiary: {
        type: ["string", "null"] as unknown as "string",
        description: "Name the cascade beneficiary if secondary impact > direct. null if not applicable.",
      },
      genderFlag: {
        type: ["string", "null"] as unknown as "string",
        description: "One sentence naming the gendered workaround eliminated. null if not applicable.",
      },
      confidenceLevel: {
        type: "string",
        enum: ["high", "medium", "low"],
      },
      layers: {
        type: "array",
        description: "3 layers: POLICY (3 dims: fiscal, targeting, impact), HIDDEN (4 dims: workaround, hierarchy, permanence, cancellability), DIGNITY (3 dims: locus, release, language)",
        items: {
          type: "object",
          properties: {
            name: { type: "string", enum: ["POLICY", "HIDDEN", "DIGNITY"] },
            label: { type: "string" },
            dimensions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  score: { type: "number" },
                  reasoning: { type: "string" },
                },
                required: ["name", "score", "reasoning"],
              },
            },
            explanation: { type: "string" },
            signal: { type: "string" },
          },
          required: ["name", "label", "dimensions", "explanation", "signal"],
        },
      },
      designIntegrity: {
        type: "number",
        description: "Design Integrity score 0-100. Start at 50, add/subtract based on evidence signals.",
      },
      designIntegrityNote: {
        type: "string",
        description: "2-3 sentences naming the specific signals that drove the DI score",
      },
      hiddenCost: { type: "string" },
      hiddenCostHeadline: {
        type: "string",
        description: "Short punchy headline for hidden cost section, max 60 chars",
      },
      whatNumbersMiss: { type: "string" },
      oneLine: { type: "string" },
      shareLine: { type: "string" },
    },
    required: [
      "freebieAnswer", "freebieShort",
      "archetype", "archetypeName", "archetypeReason",
      "marketFailureType", "marketFailureTypeName", "incidenceFlag",
      "cascadeBeneficiary", "genderFlag", "confidenceLevel",
      "layers", "designIntegrity", "designIntegrityNote",
      "hiddenCost", "hiddenCostHeadline", "whatNumbersMiss",
      "oneLine", "shareLine",
    ],
  },
};

const BEDROCK_MODEL = process.env.BEDROCK_MODEL || "us.anthropic.claude-sonnet-4-5-20250929-v1:0";

async function callClaude(scheme: string): Promise<z.infer<typeof WSDOutputSchema>> {
  const clientOpts: Record<string, string> = {
    awsRegion: process.env.BEDROCK_REGION || process.env.AWS_REGION || "us-east-1",
  };
  if (process.env.BEDROCK_ACCESS_KEY_ID && process.env.BEDROCK_SECRET_ACCESS_KEY) {
    clientOpts.awsAccessKey = process.env.BEDROCK_ACCESS_KEY_ID;
    clientOpts.awsSecretKey = process.env.BEDROCK_SECRET_ACCESS_KEY;
  }
  const client = new AnthropicBedrock(clientOpts);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90_000);

      const response = await client.messages.create(
        {
          model: BEDROCK_MODEL,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          tools: [TOOL_DEFINITION],
          tool_choice: { type: "tool", name: "analyze_scheme_wsd" },
          messages: [{ role: "user", content: `Government scheme to analyze: ${scheme}` }],
        },
        { signal: controller.signal },
      );

      clearTimeout(timeout);

      const toolBlock = response.content.find((b) => b.type === "tool_use");
      if (!toolBlock || toolBlock.type !== "tool_use") {
        throw new Error("No tool use in response");
      }

      return WSDOutputSchema.parse(toolBlock.input);
    } catch (error: unknown) {
      const isRetryable =
        error instanceof Error &&
        ("status" in error && (
          (error as { status: number }).status === 429 ||
          (error as { status: number }).status >= 500
        ));
      if (attempt === 0 && isRetryable) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw error;
    }
  }

  throw new Error("Unexpected: exhausted retries");
}

// --- WSD v1.3 Score Computation ---

function computeWSD(layers: z.infer<typeof WSDOutputSchema>["layers"]): {
  wsdScore: number;
  layerScores: { policy: number; hidden: number; dignity: number };
  policyTargeting: number;
} {
  const policyLayer = layers.find(l => l.name === "POLICY")!;
  const hiddenLayer = layers.find(l => l.name === "HIDDEN")!;
  const dignityLayer = layers.find(l => l.name === "DIGNITY")!;

  // POLICY: fiscal 25%, targeting 40%, impact 35%
  const policyWeights = [0.25, 0.40, 0.35];
  const policyScore = policyLayer.dimensions.reduce((s, d, i) => s + d.score * (policyWeights[i] || 0), 0);

  // HIDDEN: workaround 35%, hierarchy 30%, permanence 20%, cancellability 15%
  const hiddenWeights = [0.35, 0.30, 0.20, 0.15];
  const hiddenScore = hiddenLayer.dimensions.reduce((s, d, i) => s + d.score * (hiddenWeights[i] || 0), 0);

  // DIGNITY: locus 40%, release 35%, language 25%
  const dignityWeights = [0.40, 0.35, 0.25];
  const dignityScore = dignityLayer.dimensions.reduce((s, d, i) => s + d.score * (dignityWeights[i] || 0), 0);

  // Geometric mean formula
  const policyNorm = policyScore / 100;
  const hiddenNorm = hiddenScore / 100;
  const dignityNorm = dignityScore / 100;
  let wsdRaw = Math.pow(policyNorm * hiddenNorm * dignityNorm, 1 / 3) * 100;

  // Floor constraint
  if (policyScore < 25 || hiddenScore < 25 || dignityScore < 25) {
    wsdRaw = Math.min(wsdRaw, 40);
  }

  const wsdScore = Math.round(Math.max(0, Math.min(100, wsdRaw)));
  const policyTargeting = policyLayer.dimensions[1]?.score || 0;

  return {
    wsdScore,
    layerScores: {
      policy: Math.round(policyScore),
      hidden: Math.round(hiddenScore),
      dignity: Math.round(dignityScore),
    },
    policyTargeting,
  };
}

function confidenceBand(level: string): number {
  if (level === "high") return 8;
  if (level === "medium") return 15;
  return 22;
}

// --- Route handler ---

export const maxDuration = 120; // seconds — Bedrock calls take 60-90s

// Streaming response to keep Amplify SSR Lambda alive (30s hard timeout).
// Sends heartbeat newlines every 5s while Bedrock processes, then the JSON result.
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify Cloudflare Turnstile token — required when TURNSTILE_SECRET is configured
  if (TURNSTILE_SECRET) {
    const turnstileToken = body.turnstileToken || "";
    if (!turnstileToken) {
      return NextResponse.json({ error: "captcha_required" }, { status: 403 });
    }
    const valid = await verifyTurnstile(turnstileToken, ip);
    if (!valid) {
      return NextResponse.json({ error: "captcha_failed" }, { status: 403 });
    }
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send heartbeat newlines every 5s to keep the connection alive
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode("\n"));
      }, 5000);

      try {
        const analysis = await callClaude(parsed.data.scheme);

        clearInterval(heartbeat);

        // Check for "not a scheme"
        const allDimensions = analysis.layers.flatMap((l) => l.dimensions);
        const allNegative = allDimensions.every((d) => d.score === -1);

        let result;
        if (allNegative) {
          result = {
            score: null,
            freebieAnswer: "It's complicated" as const,
            freebieShort: "Not a recognizable government scheme",
            verdict: "Not a Scheme",
            verdictColor: "#A1A1AA",
            wsdScore: 0,
            confidenceBand: 22,
            confidenceLevel: "low",
            designIntegrity: 0,
            designIntegrityNote: "",
            oneLine: analysis.oneLine,
            archetype: analysis.archetype,
            archetypeName: analysis.archetypeName,
            archetypeReason: analysis.archetypeReason,
            marketFailureType: analysis.marketFailureType,
            marketFailureTypeName: analysis.marketFailureTypeName,
            incidenceFlag: null,
            cascadeBeneficiary: null,
            genderFlag: null,
            layers: analysis.layers.map(l => ({ ...l, score: 0 })),
            hiddenCost: analysis.hiddenCost,
            hiddenCostHeadline: analysis.hiddenCostHeadline,
            whatNumbersMiss: analysis.whatNumbersMiss,
            shareLine: analysis.shareLine,
            shareSignature: "",
          };
        } else {
          const { wsdScore, layerScores, policyTargeting } = computeWSD(analysis.layers);
          const verdict = assignVerdict(wsdScore, analysis.designIntegrity, policyTargeting);
          const sig = signResult(wsdScore, analysis.designIntegrity);
          const band = confidenceBand(analysis.confidenceLevel);

          const layersWithScores = analysis.layers.map(l => ({
            ...l,
            score: l.name === "POLICY" ? layerScores.policy
                 : l.name === "HIDDEN" ? layerScores.hidden
                 : layerScores.dignity,
          }));

          result = {
            score: wsdScore,
            freebieAnswer: analysis.freebieAnswer,
            freebieShort: analysis.freebieShort,
            wsdScore,
            confidenceBand: band,
            confidenceLevel: analysis.confidenceLevel,
            designIntegrity: analysis.designIntegrity,
            designIntegrityNote: analysis.designIntegrityNote,
            verdict: verdict.label,
            verdictColor: verdict.color,
            oneLine: analysis.oneLine,
            archetype: analysis.archetype,
            archetypeName: analysis.archetypeName,
            archetypeReason: analysis.archetypeReason,
            marketFailureType: analysis.marketFailureType,
            marketFailureTypeName: analysis.marketFailureTypeName,
            incidenceFlag: analysis.incidenceFlag,
            cascadeBeneficiary: analysis.cascadeBeneficiary,
            genderFlag: analysis.genderFlag,
            layers: layersWithScores,
            hiddenCost: analysis.hiddenCost,
            hiddenCostHeadline: analysis.hiddenCostHeadline,
            whatNumbersMiss: analysis.whatNumbersMiss,
            shareLine: analysis.shareLine,
            shareSignature: sig,
          };
        }

        controller.enqueue(encoder.encode(JSON.stringify(result)));
        controller.close();
      } catch (error: unknown) {
        clearInterval(heartbeat);
        const msg = error instanceof z.ZodError
          ? (error.issues[0]?.message || "Invalid input")
          : "analysis_failed";
        console.error("Analysis error:", error);
        controller.enqueue(encoder.encode(JSON.stringify({ error: msg })));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
