import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const tempDir = await mkdtemp(join(tmpdir(), "malsight-threat-weather-"));

async function compileModule(name) {
  const sourcePath = new URL(`../lib/threat-weather/${name}.ts`, import.meta.url);
  const source = await readFile(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false,
    },
  }).outputText
    .replaceAll("\"./validation\"", "\"./validation.mjs\"")
    .replaceAll("\"./aggregate\"", "\"./aggregate.mjs\"")
    .replaceAll("\"./sources\"", "\"./sources.mjs\"");
  const outputPath = join(tempDir, `${name}.mjs`);
  await writeFile(outputPath, output, "utf8");
  return outputPath;
}

await compileModule("validation");
await compileModule("aggregate");
await compileModule("sources");

const validation = await import(`file:///${join(tempDir, "validation.mjs").replaceAll("\\", "/")}`);
const aggregate = await import(`file:///${join(tempDir, "aggregate.mjs").replaceAll("\\", "/")}`);
const sources = await import(`file:///${join(tempDir, "sources.mjs").replaceAll("\\", "/")}`);

const now = Date.parse("2026-07-04T12:00:00.000Z");

function sourceStatus(name, status = "validated") {
  return {
    name,
    configured: true,
    mode: status === "validated" ? "live" : "none",
    status,
    retrievedAt: status === "validated" ? new Date(now).toISOString() : null,
    itemCount: status === "validated" ? 1 : 0,
    message: status === "validated" ? "Validated live data" : "No validated data available",
  };
}

function dataset(overrides = {}) {
  return {
    source: "UnitSource",
    retrievedAt: new Date(now).toISOString(),
    ttlMs: 60_000,
    iocs: [
      {
        type: "ip",
        value: "8.8.8.8",
        source: "UnitSource",
        firstSeen: null,
        lastSeen: null,
        confidence: "high",
      },
    ],
    signals: { iocVolume: 1 },
    status: sourceStatus("UnitSource"),
    ...overrides,
  };
}

test("rejects invalid IOC formats", () => {
  assert.equal(validation.isValidIp("999.1.1.1"), false);
  assert.equal(validation.isValidDomain("not a domain"), false);
  assert.equal(validation.isValidUrl("javascript:alert(1)"), false);
  assert.equal(validation.isValidHash("abc123"), false);
  assert.equal(validation.isValidEmail("bad-email"), false);
});

test("accepts valid IOC formats", () => {
  assert.equal(validation.isValidIp("8.8.8.8"), true);
  assert.equal(validation.isValidDomain("example.com"), true);
  assert.equal(validation.isValidUrl("https://example.com/login"), true);
  assert.equal(validation.isValidHash("a".repeat(64)), true);
  assert.equal(validation.isValidEmail("analyst@example.com"), true);
});

test("deduplicates IOCs across sources", () => {
  const iocs = validation.dedupeIocs([
    {
      type: "domain",
      value: "Example.com",
      source: "A",
      firstSeen: null,
      lastSeen: null,
      confidence: "low",
    },
    {
      type: "domain",
      value: "example.com",
      source: "B",
      firstSeen: null,
      lastSeen: null,
      confidence: "high",
    },
  ]);

  assert.equal(iocs.length, 1);
  assert.equal(iocs[0].source, "A, B");
  assert.equal(iocs[0].confidence, "high");
});

test("does not count invalid IOCs", () => {
  const totals = validation.countTotals(
    validation.dedupeIocs([
      {
        type: "ip",
        value: "300.1.1.1",
        source: "Bad",
        firstSeen: null,
        lastSeen: null,
        confidence: "low",
      },
      {
        type: "url",
        value: "https://example.com/a",
        source: "Good",
        firstSeen: null,
        lastSeen: null,
        confidence: "medium",
      },
    ]),
  );

  assert.equal(totals.ip, 0);
  assert.equal(totals.url, 1);
});

test("all failed sources fail closed", () => {
  const output = aggregate.aggregateThreatWeather(
    [],
    [sourceStatus("A", "failed"), sourceStatus("B", "failed")],
    2,
    "live",
    now,
  );

  assert.equal(output.health, "unavailable");
  assert.equal(output.threatIndex, null);
  assert.match(output.healthMessage, /unavailable/i);
});

test("partial data reports partial observations", () => {
  const output = aggregate.aggregateThreatWeather(
    [dataset()],
    [sourceStatus("UnitSource"), sourceStatus("Failed", "failed")],
    2,
    "live",
    now,
  );

  assert.equal(output.health, "partial");
  assert.equal(output.iocCollector.totals.ip, 1);
  assert.match(output.healthMessage, /1 of 2 sources/);
});

test("stale cached-looking data is excluded from current scoring", () => {
  const output = aggregate.aggregateThreatWeather(
    [
      dataset({
        retrievedAt: new Date(now - 10 * 60_000).toISOString(),
        ttlMs: 1,
      }),
    ],
    [sourceStatus("UnitSource")],
    1,
    "cached",
    now,
  );

  assert.equal(output.health, "unavailable");
  assert.equal(output.threatIndex, null);
});

test("signal-only scanning data does not become IOC evidence", () => {
  const output = aggregate.aggregateThreatWeather(
    [
      dataset({
        iocs: [],
        signals: { internetScanning: 10000 },
      }),
    ],
    [sourceStatus("UnitSource")],
    1,
    "live",
    now,
  );

  assert.equal(output.health, "available");
  assert.equal(output.iocCollector.totals.ip, 0);
  assert.equal(output.contributors.find((item) => item.name === "internetScanning").value, 10000);
});

test("development mock mode is explicit", async () => {
  sources.clearThreatWeatherCache();
  process.env.MALSIGHT_USE_MOCK_THREAT_WEATHER = "true";

  const failingFetch = async () => {
    throw new Error("network disabled in test");
  };
  const result = await sources.fetchThreatWeatherDatasets(failingFetch, now);

  delete process.env.MALSIGHT_USE_MOCK_THREAT_WEATHER;

  assert.equal(result.mode, "mock");
  assert.ok(result.datasets.some((item) => item.source === "Local development mock"));
});

test("optional keyed sources are reported unconfigured without API keys", async () => {
  sources.clearThreatWeatherCache();
  const previousVirusTotalKey = process.env.VIRUSTOTAL_API_KEY;
  const previousGreyNoiseKey = process.env.GREYNOISE_API_KEY;
  delete process.env.VIRUSTOTAL_API_KEY;
  delete process.env.GREYNOISE_API_KEY;

  const failingFetch = async () => {
    throw new Error("network disabled in test");
  };
  const result = await sources.fetchThreatWeatherDatasets(failingFetch, now);

  if (previousVirusTotalKey) process.env.VIRUSTOTAL_API_KEY = previousVirusTotalKey;
  if (previousGreyNoiseKey) process.env.GREYNOISE_API_KEY = previousGreyNoiseKey;

  const virusTotal = result.statuses.find((item) => item.name === "VirusTotal");
  const greyNoise = result.statuses.find((item) => item.name === "GreyNoise");

  assert.equal(virusTotal.configured, false);
  assert.equal(virusTotal.message, "Source is not configured");
  assert.equal(greyNoise.configured, false);
  assert.equal(greyNoise.message, "Source is not configured");
});
