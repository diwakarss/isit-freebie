# Is It a Freebie?

AI-powered analysis of Indian government welfare schemes. Paste a scheme URL or description, and get an honest verdict on whether it delivers genuine uplift or is designed to look good on paper.

**Live at [isitafreebie.jdlabs.top](https://isitafreebie.jdlabs.top)**

## How It Works

The engine uses the **WSD (Welfare Scheme Decoder) Model Spec v1.3** — a structured framework that scores schemes across three dimensions:

- **Outcome Structural Validity (OSV)** — Are outcomes third-party verified and independently measurable?
- **Hidden Cost Exposure Score (HCES)** — What are the real costs in time, money, and effort?
- **Practical Access Efficiency (PAE)** — Can the target population actually access the benefit?

A geometric mean produces the final score: `(OSV × HCES × PAE)^(1/3) × 100`, mapped to one of six verdict categories from "Genuine uplift" to "Designed to be seen."

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS 4, Framer Motion
- **AI**: Claude via Amazon Bedrock
- **Hosting**: AWS Amplify (SSR)
- **API**: AWS Lambda (120s timeout for long Bedrock calls)
- **Infrastructure**: Terraform (Amplify, Lambda, IAM, Cloudflare DNS, AWS Budget)
- **Security**: Cloudflare Turnstile, HMAC request tokens, per-IP rate limiting, Lambda concurrency cap (5)

## Project Structure

```
src/
  app/
    page.tsx          # Main UI — input, analysis, verdict
    api/analyze/      # Next.js API route (dev + Amplify SSR)
  components/         # UI components (InputSection, VerdictCard, etc.)
  types/              # TypeScript types
lambda/
  index.mjs           # Standalone Lambda for production API
infra/
  main.tf             # Terraform configuration
  variables.tf        # Terraform variables
```

## Development

```bash
npm install
npm run dev
```

Requires a `.env.local` with:

```
ANTHROPIC_API_KEY=...          # For local dev (direct Claude API)
NEXT_PUBLIC_ANALYZE_URL=...    # Lambda URL for production
NEXT_PUBLIC_REQUEST_TOKEN_SECRET=...
```

## Deployment

Frontend deploys automatically via Amplify on push to `master`. Lambda is managed via Terraform:

```bash
cd infra
terraform init
terraform apply
```

## License

MIT
