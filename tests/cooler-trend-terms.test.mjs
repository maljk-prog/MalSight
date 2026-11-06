import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { explainCyberTrend, trendFieldLabels } from "../lib/cooler-trend-terms.ts";

test("every tracked cyber topic has a specific five-field explanation and analogy", () => {
  const route = readFileSync(new URL("../app/api/cooler-talk/route.ts", import.meta.url), "utf8");
  const tracked = route.match(/const CYBER_TOPIC_QUERIES = \[([\s\S]*?)\];/);
  assert.ok(tracked, "Could not locate the live topic list");
  const topics = [...tracked[1].matchAll(/"([^"]+)"/g)].map(match => match[1]);
  assert.ok(topics.length > 0);
  for (const query of topics) {
    const term = explainCyberTrend(query);
    assert.equal(term.title, query);
    assert.equal(term.fields.length, trendFieldLabels.length);
    assert.equal(term.fields.length, 5);
    assert.ok(term.fields.every(field => field.length > 30));
    assert.ok(!term.fields[0].includes("current cybersecurity topic"), `${query} lacks a specific explanation`);
    assert.ok(term.analogy.length > 40);
  }
});

test("changing the trend replaces its explanation instead of retaining the previous term", () => {
  const privilege = explainCyberTrend("privilege escalation");
  const phishing = explainCyberTrend("phishing campaign");
  assert.match(privilege.fields[0], /permissions/);
  assert.match(phishing.fields[0], /deceptive messages/);
  assert.notDeepEqual(privilege.fields, phishing.fields);
  assert.notEqual(privilege.analogy, phishing.analogy);
  assert.equal(explainCyberTrend("  PRIVILEGE   ESCALATION  ").fields[0], privilege.fields[0]);
});

test("an unfamiliar trend preserves its title and describes attention without inventing an incident", () => {
  const term = explainCyberTrend("new security topic");
  assert.equal(term.title, "new security topic");
  assert.equal(term.fields.length, 5);
  assert.match(term.fields[1], /rather than proving an incident/);
  assert.ok(!term.fields.join(" ").includes("Privilege escalation"));
});
