import assert from "node:assert/strict";
import test from "node:test";

import { questionBank } from "../lib/training/expandedQuestions.ts";

const oldGenericFeedback = "This choice creates avoidable risk, weakens assurance, or fails to address the stated security objective.";
const oldPlaceholderAnswers = [
  "Rely on an undocumented manual workaround with no accountable owner",
  "Broaden access or exposure to reduce short-term operational friction",
  "Disable relevant monitoring until the activity is complete",
  "Defer the decision indefinitely without documenting or tracking the risk",
  "Assume a single technical control removes the need for verification",
];

test("every incorrect Training Grounds answer has specific feedback", () => {
  for (const question of questionBank) {
    const incorrect = question.answers.filter((answer) => answer.id !== question.correctAnswer);
    const explanations = incorrect.map((answer) => question.answerExplanations[answer.id]);

    assert.equal(explanations.length, 3);
    assert.equal(new Set(explanations).size, 3, `${question.id} repeats feedback across its wrong answers`);

    for (const explanation of explanations) {
      assert.notEqual(explanation, oldGenericFeedback, `${question.id} still uses the generic fallback`);
      assert.ok(explanation.length >= 100, `${question.id} has feedback that is too vague`);
    }

    assert.equal(new Set(question.answers.map((answer) => answer.text)).size, 4, `${question.id} repeats an answer`);
    for (const answer of question.answers) {
      assert.ok(!oldPlaceholderAnswers.includes(answer.text), `${question.id} still uses a placeholder distractor`);
    }
  }
});

test("questions do not reuse the same set of wrong answers", () => {
  const signaturesByPool = new Map();

  for (const question of questionBank) {
    const pool = `${question.domain}:${question.difficulty}`;
    const signatures = signaturesByPool.get(pool) ?? new Set();
    const signature = question.answers
      .filter((answer) => answer.id !== question.correctAnswer)
      .map((answer) => answer.text)
      .sort()
      .join("|");

    assert.ok(!signatures.has(signature), `${question.id} reuses a distractor set in the same category and difficulty`);
    signatures.add(signature);
    signaturesByPool.set(pool, signatures);
  }
});

test("technical specialties provide a substantial hands-on question set", () => {
  const technicalDomains = [
    "digital-forensics-incident-response",
    "detection-engineering-threat-hunting",
    "malware-analysis-reverse-engineering",
    "cloud-container-security",
  ];

  for (const domain of technicalDomains) {
    const questions = questionBank.filter((question) => question.domain === domain);
    assert.equal(questions.length, 36, `${domain} should provide 12 concepts across three difficulty levels`);
    assert.equal(new Set(questions.map((question) => question.keyConcept)).size, 12);
  }
});

test("question prompts use varied scenario structures", () => {
  const oldTemplate = /^While .+, which approach should an analyst recommend FIRST\?$/;
  const openings = new Set(questionBank.map((question) => question.question.split(/[.:?]/, 1)[0]));

  assert.ok(questionBank.every((question) => !oldTemplate.test(question.question)), "the old repeated prompt template remains");
  assert.ok(openings.size > 100, "question openings are not varied enough");
});
