import { AnthropicBedrock } from "@anthropic-ai/bedrock-sdk";
import { z } from "zod";
import { createHmac } from "crypto";

// --- Zod schemas for WSD v1.3 ---

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

// --- Rate limiting (per-instance, supplemented by Lambda concurrency cap) ---

const rateLimitMap = new Map();
const RATE_LIMIT_PER_IP = 5;       // 5 requests per IP per window
const RATE_WINDOW_MS = 60_000;     // 1 minute window
const GLOBAL_RATE_LIMIT = 30;      // 30 total requests per instance per window
let globalRequestCount = 0;
let globalWindowReset = Date.now() + RATE_WINDOW_MS;

function checkRateLimit(ip) {
  const now = Date.now();

  // Global rate limit across all IPs (per Lambda instance)
  if (now > globalWindowReset) {
    globalRequestCount = 0;
    globalWindowReset = now + RATE_WINDOW_MS;
  }
  globalRequestCount++;
  if (globalRequestCount > GLOBAL_RATE_LIMIT) return false;

  // Per-IP rate limit
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    // Evict old entries to prevent memory growth
    if (rateLimitMap.size > 1000) {
      for (const [key, val] of rateLimitMap) {
        if (now > val.resetAt) rateLimitMap.delete(key);
      }
    }
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_PER_IP;
}

// --- Cloudflare Turnstile verification ---

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET || "";

async function verifyTurnstile(token, ip) {
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

// --- Verdict logic (v1.3 — 6 verdicts, WSD × DI) ---

function assignVerdict(wsdScore, designIntegrity, policyTargeting) {
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

function signResult(wsdScore, designIntegrity) {
  const secret = process.env.SHARE_SECRET;
  if (!secret) return "";
  const payload = `${wsdScore}:${designIntegrity}`;
  return createHmac("sha256", secret).update(payload).digest("hex").slice(0, 8);
}

// --- System prompt (WSD v1.3) ---

const SYSTEM_PROMPT = `You are the analysis engine for 'Is It A Freebie?' — a tool that scores government schemes using the Welfare State Delta (WSD) framework. Version 1.3.

BEFORE SCORING — MANDATORY RESEARCH SEQUENCE:
0. SCHEME DISAMBIGUATION (must complete first): Does this policy idea exist in more than one state or jurisdiction? Free bus for women exists in Tamil Nadu, Delhi, Karnataka, Telangana, and others. Free school meals exist across many states. If yes, name the specific scheme being scored — the state, the year it launched, and its local name — before proceeding. Evidence from a different state's version of the same idea is barred from the DI calculation. A Delhi opposition continuation signal cannot raise Tamil Nadu's DI score.
1. Confirm the scheme exists and identify all its arms. Large schemes often have multiple components that should be scored separately.
2. Search for fiscal data, targeting data, and workaround evidence.
3. Search for beneficiary reaction evidence (social media, local press, first weeks).
4. IF THE SCHEME HAS ANY COMPETITIVE EXAM COMPONENT (UPSC, IAS, JEE, NEET, TNPSC, CAT, CLAT, or any state civil services exam): SEARCH '[scheme name] [exam] results [current year]' BEFORE SCORING. Declared exam results from an independent body are the highest quality outcome evidence available. Failing to find them before scoring is a data error.
5. Search for Design Integrity signals and any developments in the last 12 months.

FORMULA:
Overall score = ( POLICY × HIDDEN × DIGNITY )^(1/3) × 100
Each layer normalised to 0–1. Floor rule: any layer below 0.25 caps score at 40.
Report as: Overall score: [n ± band] ([confidence])

LAYER 1 — POLICY SCORE (sub-dimensions and weights):
  Fiscal health 25%, reaches the poorest 40%, long-term impact chain 35%.
  Impact chain multipliers:
    Cash/festival = 1.0×
    Infrastructure = 1.5–2.0×
    Physical asset = 1.2–1.5×
    Human capital, modelled chain = 1.5× (medium confidence)
    Human capital, third-party verified outcomes = 1.75× (raises confidence to high ±8)
  Third-party verified = declared by UPSC, NTA, State PSC, or independent auditor. NOT government self-reporting.

LAYER 2 — HIDDEN COST SCORE:
  Workaround severity 35%, power disrupted 30%, benefit lasts 20%, can be cancelled 15% (INVERTED).
  MONETARY FLOOR CHECK: If the workaround involves a recurring financial cost — daily fare, weekly fee, monthly payment to a middleman — quantify it as a percentage of daily/monthly wages for the target income group. If that percentage is ≥3% of daily wages, workaround severity scores a minimum of 75 regardless of how the evidence is framed in available sources. The severity is in the money and the frequency, not in how legibly a rupee figure appeared in search results.
  Cancellability scores: physical asset 95, infrastructure 80, legislation 70, institutionalised agency 55, budget line 35, electoral promise 15.

LAYER 3 — DIGNITY SCORE:
  Changed standing 40% (ARCHETYPE-SPECIFIC), reaction 35%, language/identity shift 25%.

ARCHETYPE LOCUS QUESTIONS:
  Type A (physical asset): "Did it arrive at home?" Default 90.
  Type B (credential): "Did it remove a human gatekeeper?" Default 45.
  Type C (infrastructure): "Did it end a daily physical hardship?" Default 85.
  Type D (cash): "Did it end a dependency relationship?" Default 35.
  Type E (service access): "Did it change terms of participation in a public institution?" Default 65–75.
  Type F (competitive pathway): "Did it open a class-restricted pathway to a specific group for the first time?" Default 80–90 when verified outcomes exist. Verified life-outcome shifts (first-generation IAS) count at full weight in language/identity sub-score.

CONFIDENCE BAND: High ±8 (third-party verified outcomes or peer review), Medium ±15 (reports, quotes, press), Low ±22 (limited data).

DESIGN INTEGRITY SCORE (start at 50):
  +25: third-party verified outcomes (UPSC/JEE/NEET results from independent body)
  +20: opposition continued scheme after winning
  +15: independent outcome evaluation published
  +15: rollout sequenced by need/poverty index
  +10: benefit amount from needs assessment
  +10: implementation plan published before rollout
  −20: no outcome monitoring at launch
  −20: rollout prioritised constituencies over need
  −15: fanfare announcement, no implementation plan
  −10: heavy party/leader branding on the object
  −10: round political number with no needs basis
  NOT SCORED: manifesto timing, implementation speed, scheme named after leader.

VERDICTS (WSD score / Design Integrity):
  ≥72 / ≥60 → "Genuine uplift"
  ≥72 / <60  → "Works despite itself"
  52–71 / ≥60 → "Solid — watch the outcomes"
  52–71 / <60  → "Looks good on paper"
  <52 / <35   → "Designed to be seen, not to work"
  <52 / ≥35   → "Well-meaning dud"
  Override: 'reaches poorest' <30 → max "Looks good on paper"

FLAGS:
  Cascade beneficiary: name them if their transformation is larger than the direct recipient's.
  Gender flag: name the gendered workaround if women disproportionately bore it.

OUTPUT (plain English, no acronyms):
0. FREEBIE ANSWER: "Yes", "No", or "It's complicated" — directly answers "Is [scheme] a freebie?"
   freebieShort: max 60 chars explaining why (e.g. "Ended debt traps — that's welfare, not a freebie" or "Cash drop with no targeting or outcome plan")
1. VERDICT | Overall score: [n ± band] | Design integrity: [n] | Confidence: [level]
2. ONE LINE: max 80 chars, no jargon, should provoke a reaction
3. ARCHETYPE: [Type + name] | [one sentence] | [cascade] | [gender]
4. POLICY [n/100]: 1 sentence + sub-scores. | Sub: Fiscal [n] / Reaches poorest [n] / Long-term impact [n]
5. HIDDEN COST [n/100]: 1 sentence + sub-scores. | Sub: Workaround [n] / Power [n] / Lasts [n] / Cancellable [n]
6. DIGNITY [n/100]: 1 sentence + sub-scores. | Sub: Changed standing [n] / Reaction [n] / Language/identity [n]
7. THE HIDDEN COST: max 75 words — specific, named, concrete. The single most important section.
8. WHAT THE NUMBERS MISS: max 50 words. One thing.
9. DESIGN INTEGRITY NOTE: 1–2 sentences on specific signals.
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
- TONE: Write for a politically aware Indian social media audience. Honest. Respects the people the scheme serves. Electoral democracy is not inherently suspicious.`;

const TOOL_DEFINITION = {
  name: "analyze_scheme_wsd",
  description: "Analyze a government scheme using WSD v1.3 framework",
  input_schema: {
    type: "object",
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
      cascadeBeneficiary: {
        type: ["string", "null"],
        description: "Name the cascade beneficiary if secondary impact > direct. null if not applicable.",
      },
      genderFlag: {
        type: ["string", "null"],
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
      "cascadeBeneficiary", "genderFlag", "confidenceLevel",
      "layers", "designIntegrity", "designIntegrityNote",
      "hiddenCost", "hiddenCostHeadline", "whatNumbersMiss",
      "oneLine", "shareLine",
    ],
  },
};

const BEDROCK_MODEL = process.env.BEDROCK_MODEL || "us.anthropic.claude-sonnet-4-5-20250929-v1:0";

async function callClaude(scheme) {
  const clientOpts = {
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
    } catch (error) {
      const isRetryable =
        error instanceof Error &&
        "status" in error &&
        (error.status === 429 || error.status >= 500);
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

function computeWSD(layers) {
  const policyLayer = layers.find((l) => l.name === "POLICY");
  const hiddenLayer = layers.find((l) => l.name === "HIDDEN");
  const dignityLayer = layers.find((l) => l.name === "DIGNITY");

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

function confidenceBand(level) {
  if (level === "high") return 8;
  if (level === "medium") return 15;
  return 22;
}

// --- CORS helpers ---

const ALLOWED_ORIGINS = [
  "https://isitafreebie.jdlabs.top",
  "http://localhost:3456",
];

function getCorsHeaders(requestOrigin) {
  const origin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

// --- Lambda handler ---

export async function handler(event) {
  const requestOrigin = event.headers?.["origin"] || event.headers?.["Origin"] || "";
  const corsHeaders = getCorsHeaders(requestOrigin);
  const method = event.requestContext?.http?.method || "POST";

  // Handle OPTIONS preflight
  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  if (method !== "POST") {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Server-side origin enforcement (CORS is browser-only, curl bypasses it)
  if (requestOrigin && !ALLOWED_ORIGINS.includes(requestOrigin)) {
    return {
      statusCode: 403,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "forbidden" }),
    };
  }

  // Rate limiting using source IP (Lambda Function URL provides real sourceIp)
  const ip = event.requestContext?.http?.sourceIp || "unknown";

  if (!checkRateLimit(ip)) {
    return {
      statusCode: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "rate_limited" }),
    };
  }

  // Parse body with size check
  const rawBody = event.body || "{}";
  if (rawBody.length > 2000) {
    return {
      statusCode: 413,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Request too large" }),
    };
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  // Verify Cloudflare Turnstile token (server-side, can't be faked)
  // If token is present, it MUST verify. If absent, allow with rate limiting only.
  const turnstileToken = body.turnstileToken || "";
  if (TURNSTILE_SECRET && turnstileToken) {
    const valid = await verifyTurnstile(turnstileToken, ip);
    if (!valid) {
      return {
        statusCode: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "captcha_failed" }),
      };
    }
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: parsed.error.issues[0]?.message || "Invalid input" }),
    };
  }

  try {
    const analysis = await callClaude(parsed.data.scheme);

    // Check for "not a scheme"
    const allDimensions = analysis.layers.flatMap((l) => l.dimensions);
    const allNegative = allDimensions.every((d) => d.score === -1);

    let result;
    if (allNegative) {
      result = {
        score: null,
        freebieAnswer: "It's complicated",
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
        cascadeBeneficiary: null,
        genderFlag: null,
        layers: analysis.layers.map((l) => ({ ...l, score: 0 })),
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

      const layersWithScores = analysis.layers.map((l) => ({
        ...l,
        score:
          l.name === "POLICY" ? layerScores.policy
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

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (error) {
    const msg =
      error instanceof z.ZodError
        ? (error.issues[0]?.message || "Invalid input")
        : "analysis_failed";
    console.error("Analysis error:", error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: msg }),
    };
  }
}

export default handler;
