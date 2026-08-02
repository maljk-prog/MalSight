export type Difficulty = "green" | "orange" | "red";

export type SecurityDomain =
  | "security-risk-management"
  | "asset-security"
  | "security-architecture-engineering"
  | "communication-network-security"
  | "identity-access-management"
  | "security-assessment-testing"
  | "security-operations"
  | "software-development-security";

export type AnswerId = "A" | "B" | "C" | "D";

export interface QuizQuestion {
  id: string;
  domain: SecurityDomain;
  difficulty: Difficulty;
  question: string;
  answers: { id: AnswerId; text: string }[];
  correctAnswer: AnswerId;
  explanation: string;
  answerExplanations: Record<AnswerId, string>;
  keyConcept?: string;
  mitreTechnique?: { id: string; name: string };
}
