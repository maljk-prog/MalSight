# MalSight

MalSight is a Next.js security-intelligence dashboard for exploring current cyber risk from one workspace. It combines exploited vulnerabilities, breach reporting, public source-IP telemetry, threat indicators, and impact analysis in a defender-focused interface.

## Dashboard views

- **Home / Threat Weather** — summarizes validated indicators and source health across public, no-account threat feeds.
- **Exploited CVEs** — browses the CISA Known Exploited Vulnerabilities catalog by vendor, keyword, impact, or recent additions.
- **Breach News** — groups current security headlines and connects mentioned CVEs back to the KEV catalog.
- **Threat Map** — aggregates public DShield source-IP telemetry by country, network owner, and ASN.
- **Impact Chain** — explains how a vulnerability can progress from technical exposure to business impact.
- **Cooler Talk** — tracks current cybersecurity search interest and discussion topics.

## Data sources

MalSight uses public feeds including CISA KEV, URLhaus, MalwareBazaar, Emerging Threats, blocklist.de, SANS ISC DShield, PhishTank, and OpenPhish. Threat-feed availability is surfaced in the interface, and stale or invalid indicators are excluded from current scoring.

The Threat Map includes an on-demand public-IP lookup backed by SANS ISC/DShield, RDAP, ipwho.is, and Outpost's public reputation signals, with no API key required.

Public telemetry may contain false positives. MalSight is an educational and portfolio project, not a blocklist or a substitute for official security guidance.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If that port is already occupied, Next.js prints the alternate local URL in the terminal.

## Validate

```bash
npm test
npm run build
```

## Deploy

1. Push the repository to GitHub.
2. Import it into Vercel.
3. Deploy with the default Next.js settings.

The live threat-weather adapters do not require API keys. External feeds can still be temporarily slow or unavailable, so the dashboard reports partial source health instead of treating missing data as verified intelligence.
