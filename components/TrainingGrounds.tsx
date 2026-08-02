"use client";

import { useMemo, useState } from "react";
import { questionBank } from "../lib/training/expandedQuestions";
import type { AnswerId, Difficulty, QuizQuestion, SecurityDomain } from "../lib/training/types";

const domains: { id: SecurityDomain | "mixed"; name: string; description: string }[] = [
  { id:"mixed", name:"Mixed / All Domains", description:"Draw from every governance and technical security category." },
  { id:"security-risk-management", name:"Security and Risk Management", description:"Governance, compliance, policy, risk, and business continuity." },
  { id:"asset-security", name:"Asset Security", description:"Classification, ownership, retention, privacy, and disposal." },
  { id:"security-architecture-engineering", name:"Security Architecture and Engineering", description:"Architecture, cryptography, models, and secure design." },
  { id:"communication-network-security", name:"Communication and Network Security", description:"Networks, segmentation, firewalls, VPNs, and protocols." },
  { id:"identity-access-management", name:"Identity and Access Management (IAM)", description:"Authentication, authorization, MFA, federation, and access." },
  { id:"security-assessment-testing", name:"Security Assessment and Testing", description:"Assessments, penetration tests, audits, and validation." },
  { id:"security-operations", name:"Security Operations", description:"Detection, response, forensics, recovery, and threat hunting." },
  { id:"software-development-security", name:"Software Development Security", description:"Secure SDLC, DevSecOps, code, and supply-chain security." },
  { id:"digital-forensics-incident-response", name:"Digital Forensics & Incident Response", description:"Windows artifacts, timelines, memory, disk, and evidence-driven scoping." },
  { id:"detection-engineering-threat-hunting", name:"Detection Engineering & Threat Hunting", description:"SIEM queries, endpoint telemetry, behavioral analytics, and detection validation." },
  { id:"malware-analysis-reverse-engineering", name:"Malware Analysis & Reverse Engineering", description:"Static and dynamic analysis, PE internals, unpacking, debugging, and YARA." },
  { id:"cloud-container-security", name:"Cloud & Container Security", description:"Cloud audit logs, IAM, Kubernetes, containers, secrets, and runtime evidence." },
];
const domainCount = domains.length - 1;

const levels: { id: Difficulty; label: string; description: string }[] = [
  { id:"green", label:"GREEN — FOUNDATIONAL", description:"Core terminology, concepts, and controls." },
  { id:"orange", label:"ORANGE — ANALYST", description:"Practical scenarios and investigation decisions." },
  { id:"red", label:"RED — ADVANCED", description:"Complex tradeoffs, architecture, and response reasoning." },
];

type Result = { question: QuizQuestion; answer: AnswerId };
type Screen = "setup" | "quiz" | "results";
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

export default function TrainingGrounds() {
  const [selectedDomains, setSelectedDomains] = useState<(SecurityDomain | "mixed")[]>(["mixed"]);
  const [difficulty, setDifficulty] = useState<Difficulty>("orange");
  const [length, setLength] = useState(10);
  const [screen, setScreen] = useState<Screen>("setup");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<AnswerId | null>(null);
  const [results, setResults] = useState<Result[]>([]);

  const uniqueQuestionCount = useMemo(() => {
    const concepts = new Set(
      questionBank
        .filter((q) => q.difficulty === difficulty && (selectedDomains.includes("mixed") || selectedDomains.includes(q.domain)))
        .map((q) => `${q.domain}:${q.keyConcept || q.question}`),
    );
    return concepts.size;
  }, [difficulty, selectedDomains]);

  const sessionLengths = useMemo(
    () => [...new Set([Math.min(5, uniqueQuestionCount), Math.min(10, uniqueQuestionCount), Math.min(20, uniqueQuestionCount)])].filter(Boolean),
    [uniqueQuestionCount],
  );

  const chooseDomain = (nextDomain: SecurityDomain | "mixed") => {
    const nextSelection = nextDomain === "mixed"
      ? ["mixed" as const]
      : selectedDomains.includes("mixed")
        ? [nextDomain]
        : selectedDomains.includes(nextDomain)
          ? selectedDomains.filter((item) => item !== nextDomain)
          : [...selectedDomains, nextDomain];
    const safeSelection = nextSelection.length ? nextSelection : [nextDomain];
    const conceptCount = new Set(
      questionBank
        .filter((q) => q.difficulty === difficulty && (safeSelection.includes("mixed") || safeSelection.includes(q.domain)))
        .map((q) => `${q.domain}:${q.keyConcept || q.question}`),
    ).size;
    setSelectedDomains(safeSelection);
    setLength(Math.min(10, conceptCount));
  };

  const start = () => {
    const eligible = questionBank.filter((q) => q.difficulty === difficulty && (selectedDomains.includes("mixed") || selectedDomains.includes(q.domain)));
    const uniqueByConcept = new Map<string, QuizQuestion>();
    shuffle(eligible).forEach((question) => {
      const duplicateKey = `${question.domain}:${question.keyConcept || question.question}`;
      if (!uniqueByConcept.has(duplicateKey)) uniqueByConcept.set(duplicateKey, question);
    });
    const session = shuffle([...uniqueByConcept.values()]).slice(0, Math.min(length, uniqueByConcept.size));
    setQuestions(session); setIndex(0); setSelected(null); setResults([]); setScreen("quiz");
  };

  const answer = (id: AnswerId) => {
    if (selected) return;
    setSelected(id);
    setResults((current) => [...current, { question: questions[index], answer: id }]);
  };

  const next = () => {
    if (index === questions.length - 1) setScreen("results");
    else { setIndex((i) => i + 1); setSelected(null); }
  };

  const score = results.filter((r) => r.answer === r.question.correctAnswer).length;
  const domainBreakdown = useMemo(() => domains.slice(1).map((d) => {
    const attempted = results.filter((r) => r.question.domain === d.id);
    return { name: d.name, total: attempted.length, correct: attempted.filter((r) => r.answer === r.question.correctAnswer).length };
  }).filter((d) => d.total), [results]);

  if (screen === "quiz") {
    const q = questions[index];
    const domainName = domains.find((d) => d.id === q.domain)?.name;
    return <div className="training-shell space-y-6">
      <header className="training-header rounded-2xl p-5 sm:p-7">
        <button className="training-back mb-5" onClick={() => setScreen("setup")} aria-label="Leave quiz and return to Training Grounds">← BACK TO TRAINING GROUNDS</button>
        <p className="theme-kicker text-xs font-black tracking-[.28em]">TRAINING GROUNDS</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h2 className="theme-title text-2xl font-black">{domainName}</h2><p className={`training-level is-${difficulty}`}>{difficulty.toUpperCase()}</p></div><p className="theme-muted font-bold">Question {index + 1} / {questions.length}</p></div>
        <div className="training-progress mt-5"><span style={{ width:`${((index + 1) / questions.length) * 100}%` }} /></div>
      </header>
      <section className="training-card rounded-2xl p-5 sm:p-8">
        <h3 className="theme-title text-xl font-black leading-relaxed sm:text-2xl">{q.question}</h3>
        <div className="mt-6 grid gap-3">{q.answers.map((option) => {
          const state = selected ? option.id === q.correctAnswer ? "is-correct" : option.id === selected ? "is-incorrect" : "is-locked" : "";
          return <button key={option.id} disabled={!!selected} onClick={() => answer(option.id)} className={`training-answer ${state}`}><span>{option.id}</span><strong>{option.text}</strong></button>;
        })}</div>
        {selected && <div className={`training-feedback mt-7 ${selected === q.correctAnswer ? "is-correct" : "is-incorrect"}`} aria-live="polite">
          <p className="text-sm font-black tracking-[.18em]">{selected === q.correctAnswer ? "CORRECT" : "NOT QUITE"}</p>
          <h4 className="mt-2 text-lg font-black">{q.correctAnswer} — {q.answers.find((a) => a.id === q.correctAnswer)?.text}</h4>
          <p className="mt-5 text-xs font-black tracking-[.18em]">WHY?</p><p className="theme-muted mt-2 leading-7">{q.explanation}</p>
          <p className="mt-5 text-xs font-black tracking-[.18em]">WHY NOT THE OTHERS?</p><div className="mt-2 space-y-2">{q.answers.filter((a) => a.id !== q.correctAnswer).map((a) => <p className="theme-muted" key={a.id}><strong>{a.id} —</strong> {q.answerExplanations[a.id]}</p>)}</div>
          <div className="mt-6 grid gap-3 border-t border-current/15 pt-5 sm:grid-cols-3"><Meta label="RELATED DOMAIN" value={domainName || ""}/><Meta label="KEY CONCEPT" value={q.keyConcept || ""}/>{q.mitreTechnique && <Meta label="MITRE ATT&CK" value={`${q.mitreTechnique.id} — ${q.mitreTechnique.name}`}/>}</div>
          <button className="training-primary mt-7" onClick={next}>{index === questions.length - 1 ? "VIEW RESULTS →" : "NEXT QUESTION →"}</button>
        </div>}
      </section>
    </div>;
  }

  if (screen === "results") return <div className="training-card rounded-2xl p-6 sm:p-9">
    <p className="theme-kicker text-xs font-black tracking-[.28em]">TRAINING COMPLETE</p><h2 className="theme-title mt-2 text-4xl font-black">{score} / {results.length}</h2><p className="theme-muted mt-1 text-lg font-bold">{Math.round(score / results.length * 100)}% accuracy</p>
    <div className="mt-7 grid gap-3 sm:grid-cols-2">{domainBreakdown.map((d) => <div className="training-result" key={d.name}><span>{d.name}</span><strong>{d.correct} / {d.total}</strong></div>)}</div>
    <div className="mt-8 flex flex-wrap gap-3"><button className="training-primary" onClick={start}>TRAIN AGAIN</button><button className="training-secondary" onClick={() => setScreen("setup")}>CHANGE DOMAIN</button><button className="training-secondary" onClick={() => setScreen("setup")}>CHANGE DIFFICULTY</button><button className="training-secondary" onClick={() => setScreen("setup")}>BACK TO TRAINING GROUNDS</button></div>
  </div>;

  return <div className="training-shell space-y-6">
    <header className="training-header rounded-2xl p-6 sm:p-8"><p className="theme-kicker text-xs font-black tracking-[.3em]">KNOWLEDGE CHECK</p><h2 className="theme-title mt-2 text-4xl font-black">TRAINING GROUNDS</h2><p className="theme-muted mt-2 text-lg">Sharpen your security skills.</p><p className="theme-muted mt-5 max-w-3xl leading-7">Test your cybersecurity knowledge with questions ranging from foundational concepts to advanced security scenarios.</p></header>
    <section><div className="flex flex-wrap items-end justify-between gap-2"><h3 className="training-section-title">1 / SECURITY CATEGORY</h3><p className="theme-muted text-xs">Choose one or more of the {domainCount} categories, or use Mixed for all categories.</p></div><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{domains.map((item) => { const selected = selectedDomains.includes(item.id); return <button key={item.id} aria-pressed={selected} onClick={() => chooseDomain(item.id)} className={`training-choice ${selected ? "is-selected" : ""}`}><strong>{item.name}</strong><span>{item.description}</span>{selected && <em className="training-selected-mark">SELECTED</em>}</button>; })}</div></section>
    <section><h3 className="training-section-title">2 / DIFFICULTY</h3><div className="mt-3 grid gap-3 md:grid-cols-3">{levels.map((item) => <button key={item.id} onClick={() => setDifficulty(item.id)} className={`training-choice difficulty-${item.id} ${difficulty === item.id ? "is-selected" : ""}`}><strong>{item.label}</strong><span>{item.description}</span></button>)}</div></section>
    <section><h3 className="training-section-title">3 / SESSION LENGTH</h3><div className="mt-3 flex flex-wrap gap-3">{sessionLengths.map((n) => <button className={`training-length ${length === n ? "is-selected" : ""}`} key={n} onClick={() => setLength(n)}>{n} Questions</button>)}</div><p className="theme-muted mt-3 text-xs">Only genuinely distinct concepts are included. Reworded variants are never used twice in one session.</p></section>
    <button className="training-primary w-full sm:w-auto" onClick={start}>START TRAINING</button>
  </div>;
}

function Meta({label,value}:{label:string;value:string}) { return <div><p className="text-[10px] font-black tracking-[.16em] opacity-70">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>; }
