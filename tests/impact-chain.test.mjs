import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

const tempDir = await mkdtemp(join(tmpdir(), "malsight-impact-chain-"));
const sourcePath = new URL("../app/api/impact-chain/route.ts", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
    verbatimModuleSyntax: false,
  },
}).outputText.replace('from "rss-parser"', 'from "./rss-parser.mjs"');
const outputPath = join(tempDir, "impact-chain-route.mjs");
await writeFile(
  join(tempDir, "rss-parser.mjs"),
  "export default class Parser { async parseURL() { return { items: [] }; } }",
  "utf8",
);
await writeFile(outputPath, output, "utf8");
const impactChain = await import(
  `file:///${outputPath.replaceAll("\\", "/")}`
);

function article(overrides = {}) {
  return {
    source: "Test source",
    title: "Northwind portal reports unusual cyber activity",
    link: "https://example.com/story",
    pubDate: "Jul 15, 2026",
    timestamp: Date.now(),
    contentSnippet: "The company is investigating unusual activity affecting its customer portal.",
    ...overrides,
  };
}

test("unknown future stories still receive article-aware impact chains", () => {
  const profile = impactChain.classifyImpact(article());

  assert.match(profile.affectedSystem, /Northwind portal/i);
  assert.match(profile.humanImpact[0], /Northwind portal/i);
  assert.notDeepEqual(profile.humanImpact, [
    "Employees may lose access to normal tools and switch to slower manual processes",
    "Customers may face delays, missing updates, or reduced support quality",
    "Downstream partners can experience uncertainty around orders, billing, or service delivery",
    "The human impact often shows up as lost time, stress, higher costs, and reduced trust",
  ]);
});

test("future vulnerability stories infer an exploitation-specific progression", () => {
  const profile = impactChain.classifyImpact(
    article({
      title: "Acme Gateway vulnerability allows unauthorized access",
      contentSnippet: "A newly disclosed security flaw could be exploited against exposed appliances.",
    }),
  );

  assert.match(profile.threatEvent, /weakness/i);
  assert.match(profile.humanImpact[1], /exploitation/i);
  assert.match(profile.humanImpact[0], /Acme Gateway/i);
});

test("sector context remains present in unmatched healthcare stories", () => {
  const profile = impactChain.classifyImpact(
    article({
      title: "Regional hospital investigates unusual cyber activity",
      contentSnippet: "Clinical teams are reviewing activity involving a hospital support platform.",
    }),
  );

  assert.equal(profile.industry, "Healthcare");
  assert.match(profile.protectedAsset, /patient safety/i);
  assert.match(profile.humanImpact[0], /Regional hospital/i);
});

test("every generated chain ends with consumer or customer impact", () => {
  const futureStories = [
    article(),
    article({
      title: "Example Bank investigates a customer data breach",
      contentSnippet: "Account records may have been exposed during the incident.",
    }),
    article({
      title: "City hospital platform suffers service disruption",
      contentSnippet: "Patient scheduling systems were temporarily unavailable.",
    }),
  ];

  for (const story of futureStories) {
    const profile = impactChain.impactForArticle(story);
    assert.match(profile.humanImpact.at(-1), /^Consumer or Customer Impact:/);
  }
});
