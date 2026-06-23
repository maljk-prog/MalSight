# MalSight

MalSight is a starter Next.js security dashboard that pulls the latest 20 entries from the official CISA Known Exploited Vulnerabilities catalog and displays them in a modern scrollable table.

## Data source

Official CISA KEV JSON feed:

```txt
https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
```

## Run locally

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Deploy

The easiest deployment path is Vercel:

1. Push this folder to GitHub.
2. Import the repo into Vercel.
3. Deploy.

## Notes

This project is for educational and portfolio purposes. It does not represent official security advice or any employer.
