import type { AnswerId, Difficulty } from "./types";

export type CaseOutcome = "CASE CONTAINED" | "COMPROMISE CONFIRMED" | "PARTIAL CONTAINMENT" | "CASE FAILED" | "BENIGN ACTIVITY" | "FALSE POSITIVE" | "INSUFFICIENT EVIDENCE";

export type CaseArtifacts = {
  user: string; host: string; secondaryHost: string; server: string; filename: string;
  domain: string; ip: string; emailSubject: string; taskName: string; cloudApp: string;
  baseTime: string;
};

export type EvidenceItem = {
  id: string; source: string; title: string; detail: string; timestamp: string;
};

export type CaseAnswer = {
  id: AnswerId; text: string; correct?: boolean; critical?: boolean; explanation: string;
};

export type InvestigationStage = {
  id: string; phase: string; question: string; evidence: EvidenceItem[]; answers: CaseAnswer[];
  discoveries: string[]; tactic?: { name: string; technique: string; evidence: string };
};

export type IntrusionCase = {
  seed: number; fingerprint: string; difficulty: Difficulty;
  environment: string; tags: string[]; title: string; assignment: string;
  artifacts: CaseArtifacts; stages: InvestigationStage[]; outcome: CaseOutcome;
};

export type CaseDecision = {
  stage: InvestigationStage; answer: CaseAnswer; correct: boolean; lifeLost: boolean;
};
