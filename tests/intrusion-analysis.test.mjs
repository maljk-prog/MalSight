import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

const tempDir = await mkdtemp(join(tmpdir(), "malsight-intrusion-"));
for (const name of ["intrusionTypes", "intrusionEngine"]) {
  const source = await readFile(new URL(`../lib/training/${name}.ts`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false },
  }).outputText.replaceAll('"./intrusionTypes"', '"./intrusionTypes.mjs"');
  await writeFile(join(tempDir, `${name}.mjs`), output, "utf8");
}
const { generateIntrusionCase } = await import(`file:///${join(tempDir, "intrusionEngine.mjs").replaceAll("\\", "/")}`);

test("case seeds reproduce configuration and artifacts", () => {
  assert.deepEqual(generateIntrusionCase(8472, "orange"), generateIntrusionCase(8472, "orange"));
});

test("different seeds create meaningful structural and artifact variation", () => {
  const cases = Array.from({ length: 40 }, (_, index) => generateIntrusionCase(2000 + index, "orange"));
  assert.ok(new Set(cases.map((item) => item.fingerprint)).size >= 4);
  assert.ok(new Set(cases.map((item) => item.environment)).size >= 5);
  assert.ok(new Set(cases.map((item) => item.artifacts.host)).size >= 20);
  assert.ok(new Set(cases.map((item) => item.stages.length)).size >= 2);
});

test("replay protection deprioritizes recent structures", () => {
  const original = generateIntrusionCase(7301, "red");
  const replacement = generateIntrusionCase(7301, "red", [original.fingerprint]);
  assert.notEqual(replacement.fingerprint, original.fingerprint);
});

test("every decision has one best answer and safe simulated indicators", () => {
  for (let seed = 1; seed <= 80; seed++) {
    const generated = generateIntrusionCase(seed, "red");
    for (const stage of generated.stages) {
      assert.equal(stage.answers.filter((answer) => answer.correct).length, 1, `${generated.fingerprint}/${stage.id}`);
      assert.equal(new Set(stage.answers.map((answer) => answer.id)).size, 4);
    }
    const serialized = JSON.stringify(generated);
    assert.doesNotMatch(serialized, /https?:\/\/(?!.*(?:example|\.test|\.invalid))/i);
    assert.match(generated.artifacts.ip, /^198\.51\.100\./);
  }
});

test("engine supports malicious and benign outcomes", () => {
  const outcomes = new Set(Array.from({ length: 120 }, (_, seed) => generateIntrusionCase(seed + 9000, "green").outcome));
  assert.ok(outcomes.has("BENIGN ACTIVITY") || outcomes.has("FALSE POSITIVE"));
  assert.ok([...outcomes].some((item) => item.includes("CONTAIN") || item === "COMPROMISE CONFIRMED"));
});

test("scoping decisions use plausible scoping alternatives", () => {
  for (let seed = 1; seed <= 120; seed++) {
    const generated = generateIntrusionCase(seed, "orange");
    for (const stage of generated.stages.filter((item) => item.phase === "SCOPE")) {
      for (const answer of stage.answers) {
        assert.match(answer.text, /scope|review/i, `${generated.fingerprint}/${stage.id}: ${answer.text}`);
      }
    }
  }
});

test("investigations unfold across 10 to 20 varied decisions", () => {
  for (let seed = 1; seed <= 160; seed++) {
    const generated = generateIntrusionCase(seed, "orange");
    assert.ok(generated.stages.length >= 10 && generated.stages.length <= 20, `${generated.fingerprint}: ${generated.stages.length}`);
    assert.ok(new Set(generated.stages.map((stage) => stage.phase)).size >= 5, generated.fingerprint);
  }
});

test("containment questions offer containment alternatives", () => {
  const containmentVerb = /contain|isolate|restrict|disable|revoke|remove|block|power off|take .*offline|leave .*active|leave .*connected|leave .*unchanged|leave .*available/i;
  for (let seed = 1; seed <= 160; seed++) {
    const generated = generateIntrusionCase(seed, "red");
    for (const stage of generated.stages.filter((item) => item.phase === "CONTAIN")) {
      for (const answer of stage.answers) {
        assert.match(answer.text, containmentVerb, `${generated.fingerprint}/${stage.id}: ${answer.text}`);
      }
    }
  }
});

test("validation questions offer validation actions", () => {
  for (let seed = 1; seed <= 160; seed++) {
    const generated = generateIntrusionCase(seed, "orange");
    for (const stage of generated.stages.filter((item) => /what should you verify|validation step/i.test(item.question))) {
      for (const answer of stage.answers) {
        assert.match(answer.text, /verify|validate/i, `${generated.fingerprint}/${stage.id}: ${answer.text}`);
      }
    }
  }
});

test("every investigation question has an evidence-backed ATT&CK technique", () => {
  for (let seed = 1; seed <= 160; seed++) {
    const generated = generateIntrusionCase(seed, "orange");
    assert.equal(generated.stages.filter((stage) => stage.tactic).length, generated.stages.length);
    for (const stage of generated.stages) {
      assert.match(stage.tactic.technique, /^T\d{4}/);
      assert.ok(stage.tactic.evidence.length > 0);
    }
  }
});
