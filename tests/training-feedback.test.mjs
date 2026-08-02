import assert from "node:assert/strict";
import test from "node:test";

import { questionBank } from "../lib/training/expandedQuestions.ts";

const oldGenericFeedback = "This choice creates avoidable risk, weakens assurance, or fails to address the stated security objective.";

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
  }
});
