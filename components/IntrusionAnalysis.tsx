"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { generateIntrusionCase, seedFromNow } from "../lib/training/intrusionEngine";
import type { Difficulty } from "../lib/training/types";
import type { CaseDecision, IntrusionCase } from "../lib/training/intrusionTypes";

const difficulties: { id: Difficulty; label: string; description: string }[] = [
  { id: "green", label: "GREEN — GUIDED", description: "Clear evidence and one strongest investigative path." },
  { id: "orange", label: "ORANGE — ANALYST", description: "Correlation, distractions, and realistic SOC decisions." },
  { id: "red", label: "RED — ADVANCED", description: "Incomplete evidence, dual-use behavior, and proportionate choices." },
];

function recentFingerprints() {
  try { return JSON.parse(localStorage.getItem("malsight-recent-intrusions") || "[]") as string[]; }
  catch { return []; }
}

function remember(fingerprint: string) {
  const recent = [fingerprint, ...recentFingerprints().filter((item) => item !== fingerprint)].slice(0, 4);
  localStorage.setItem("malsight-recent-intrusions", JSON.stringify(recent));
}

export default function IntrusionAnalysis({ onBack }: { onBack: () => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("orange");
  const [caseData, setCaseData] = useState<IntrusionCase | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<CaseDecision[]>([]);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [complete, setComplete] = useState(false);

  const discoveredStages = useMemo(() => caseData?.stages.slice(0, stageIndex + (selected ? 1 : 0)).filter((item) => item.tactic) || [], [caseData, selected, stageIndex]);
  const discoveries = useMemo(() => caseData?.stages.slice(0, stageIndex + (selected ? 1 : 0)).flatMap((item) => item.discoveries) || [], [caseData, selected, stageIndex]);

  const start = (seed = seedFromNow()) => {
    setCaseData(generateIntrusionCase(seed, difficulty, recentFingerprints()));
    setStageIndex(0); setSelected(null); setHistory([]); setLives(3); setStreak(0); setBestStreak(0); setComplete(false);
  };

  if (!caseData) return <div className="training-shell space-y-6">
    <header className="training-header rounded-2xl p-6 sm:p-8">
      <button className="training-back mb-5" onClick={onBack}>← BACK TO TRAINING GROUNDS</button>
      <p className="theme-kicker text-xs font-black tracking-[.28em]">INTRUSION ANALYSIS</p>
      <h2 className="theme-title mt-2 text-4xl font-black">New SOC Investigation</h2>
      <p className="theme-muted mt-3 max-w-3xl leading-7">Begin with limited evidence, test hypotheses, scope affected systems, and make proportionate containment decisions. Cases may be malicious, benign, or inconclusive.</p>
    </header>
    <section>
      <h3 className="training-section-title">1 / DIFFICULTY</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-3">{difficulties.map((item)=><button key={item.id} onClick={()=>setDifficulty(item.id)} className={`training-choice difficulty-${item.id} ${difficulty===item.id?"is-selected":""}`}><strong>{item.label}</strong><span>{item.description}</span></button>)}</div>
    </section>
    <section className="training-card rounded-2xl p-5 sm:p-7">
      <p className="training-section-title">2 / ASSIGNMENT</p>
      <div className="mt-4 flex flex-wrap gap-2"><span className="training-length is-selected">Endpoint</span><span className="training-length">Identity</span><span className="training-length">Cloud</span><span className="training-length">Network</span></div>
      <p className="theme-muted mt-4 text-sm">A case ID and reproducible seed will be assigned when the investigation begins. Recent case structures are deprioritized automatically.</p>
    </section>
    <button className="training-primary w-full sm:w-auto" onClick={()=>start()}>ACCEPT INVESTIGATION</button>
  </div>;

  if (complete) {
    const correct = history.filter((item)=>item.correct).length;
    const accuracy = Math.round(correct / Math.max(history.length,1) * 100);
    const failed = lives === 0;
    const outcome = failed ? "CASE FAILED" : caseData.outcome;
    const missed = history.filter((item)=>!item.correct);
    return <div className="training-shell space-y-6">
      <section className="training-card rounded-2xl p-6 sm:p-9">
        <p className="theme-kicker text-xs font-black tracking-[.28em]">FINAL CASE REPORT</p>
        <h2 className="theme-title mt-2 text-4xl font-black">{outcome}</h2>
        <p className="theme-muted mt-2 font-bold">CASE #{caseData.caseId} · Seed {caseData.seed}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric label="ACCURACY" value={`${accuracy}%`}/><Metric label="LIVES REMAINING" value={`${"♥".repeat(lives)}${"♡".repeat(3-lives)}`}/><Metric label="BEST STREAK" value={`🔥 ${bestStreak}`}/></div>
        <MitrePath caseData={caseData} revealed={caseData.stages.length}/>
        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          <div className="training-feedback is-correct"><p className="text-xs font-black tracking-[.18em]">ANALYST PERFORMANCE</p><p className="theme-muted mt-3 leading-7">You made {correct} strong decisions. {failed ? "Critical mistakes materially limited containment, but the investigation remained available for learning." : "Your decisions preserved evidence and supported a proportionate response."}</p></div>
          <div className="training-feedback is-incorrect"><p className="text-xs font-black tracking-[.18em]">AREAS FOR IMPROVEMENT</p><p className="theme-muted mt-3 leading-7">{missed.length ? `${missed.length} decisions should be reviewed below.` : "No missed decisions in this investigation."}</p></div>
        </div>
        {missed.length>0&&<div className="mt-6 space-y-3"><h3 className="training-section-title">MISSED DECISIONS</h3>{missed.map((item)=><details className="training-card rounded-xl p-4" key={item.stage.id}><summary className="cursor-pointer font-black">{item.stage.phase} — {item.stage.question}</summary><div className="theme-muted mt-3 space-y-2 text-sm"><p><b>Evidence available:</b> {item.stage.evidence.map((e)=>e.title).join(", ")}</p><p><b>Your answer:</b> {item.answer.text}</p><p><b>Best answer:</b> {item.stage.answers.find((a)=>a.correct)?.text}</p><p>{item.answer.explanation}</p></div></details>)}</div>}
        <div className="mt-8 flex flex-wrap gap-3"><button className="training-primary" onClick={()=>{remember(caseData.fingerprint);start();}}>NEW CASE</button><button className="training-secondary" onClick={()=>{remember(caseData.fingerprint);setCaseData(null);}}>CHANGE DIFFICULTY</button><button className="training-secondary" onClick={onBack}>BACK TO TRAINING GROUNDS</button></div>
      </section>
    </div>;
  }

  const current = caseData.stages[stageIndex];
  const selectedAnswer = current.answers.find((item)=>item.id===selected);
  const choose = (answerId:string) => {
    if (selected) return;
    const answer = current.answers.find((item)=>item.id===answerId)!;
    const correct = Boolean(answer.correct); const lifeLost = !correct && Boolean(answer.critical);
    setSelected(answerId); setHistory((items)=>[...items,{stage:current,answer,correct,lifeLost}]);
    if(correct){const next=streak+1;setStreak(next);setBestStreak((best)=>Math.max(best,next));}else{setStreak(0);if(lifeLost)setLives((value)=>Math.max(0,value-1));}
  };
  const next = () => { if(stageIndex===caseData.stages.length-1){remember(caseData.fingerprint);setComplete(true);}else{setStageIndex((value)=>value+1);setSelected(null);} };

  return <div className="training-shell space-y-5">
    <header className="training-header rounded-2xl p-5 sm:p-7">
      <button className="training-back mb-4" onClick={()=>setCaseData(null)}>← LEAVE CASE</button>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="theme-kicker text-xs font-black tracking-[.28em]">INTRUSION ANALYSIS · CASE #{caseData.caseId}</p><h2 className="theme-title mt-2 text-2xl font-black">{caseData.title}</h2><div className="mt-3 flex flex-wrap gap-2"><span className={`training-level is-${caseData.difficulty}`}>{caseData.difficulty.toUpperCase()}</span>{caseData.tags.map((tag)=><span className="intrusion-tag" key={tag}>{tag}</span>)}</div></div><div className="text-right"><p className="intrusion-lives" aria-label={`${lives} lives remaining`}>{"♥".repeat(lives)}{"♡".repeat(3-lives)}</p><p className="theme-muted mt-2 text-sm font-black">🔥 {streak} · BEST {bestStreak}</p></div></div>
      <div className="training-progress mt-5"><span style={{width:`${((stageIndex+1)/caseData.stages.length)*100}%`}}/></div>
    </header>
    <MitrePath caseData={caseData} revealed={stageIndex+(selected?1:0)}/>
    <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
      <aside className="training-card rounded-2xl p-5"><p className="training-section-title">EVIDENCE · {current.phase}</p><div className="mt-4 space-y-3">{current.evidence.map((item)=><article className="intrusion-evidence" key={item.id}><div className="flex justify-between gap-3"><p className="font-black">{item.source}</p><time>{item.timestamp}</time></div><h4 className="mt-2 font-black">{item.title}</h4><code>{item.detail}</code></article>)}</div>{discoveries.length>0&&<div className="mt-5 border-t border-current/10 pt-4"><p className="training-section-title">DISCOVERED</p><div className="mt-3 flex flex-wrap gap-2">{[...new Set(discoveries)].map((item)=><span className="intrusion-tag is-discovered" key={item}>{item}</span>)}</div></div>}</aside>
      <section className="training-card rounded-2xl p-5 sm:p-7"><p className="theme-kicker text-xs font-black tracking-[.18em]">STAGE {stageIndex+1} / {caseData.stages.length} · {current.phase}</p><h3 className="theme-title mt-3 text-xl font-black leading-relaxed sm:text-2xl">{current.question}</h3><div className="mt-6 grid gap-3">{current.answers.map((option)=>{const state=selected?option.correct?"is-correct":option.id===selected?"is-incorrect":"is-locked":"";return <button key={option.id} disabled={!!selected} onClick={()=>choose(option.id)} className={`training-answer ${state}`}><span>{option.id}</span><strong>{option.text}</strong></button>;})}</div>{selected&&selectedAnswer&&<div className={`training-feedback mt-6 ${selectedAnswer.correct?"is-correct":"is-incorrect"}`}><p className="text-sm font-black tracking-[.18em]">{selectedAnswer.correct?"STRONG DECISION":selectedAnswer.critical?"CRITICAL INVESTIGATIVE ERROR — LIFE LOST":"MINOR ANALYTICAL ERROR"}</p><p className="theme-muted mt-3 leading-7">{selectedAnswer.explanation}</p>{lives===0&&<p className="mt-3 font-bold">No lives remain. Continue the case for educational review; the final outcome will reflect the failure.</p>}<button className="training-primary mt-6" onClick={next}>{stageIndex===caseData.stages.length-1?"FINAL ASSESSMENT →":"REVEAL NEXT EVIDENCE →"}</button></div>}</section>
    </div>
  </div>;
}

function MitrePath({caseData,revealed}:{caseData:IntrusionCase;revealed:number}) {
  const rail=useRef<HTMLDivElement>(null);
  const drag=useRef({active:false,startX:0,startLeft:0});
  const tactics=caseData.stages;
  useEffect(()=>{
    const container=rail.current;
    if(!container||revealed<1)return;
    const target=container.querySelector<HTMLElement>(`[data-path-index="${revealed-1}"]`);
    if(!target)return;
    container.scrollTo({left:Math.max(0,target.offsetLeft-container.clientWidth+target.clientWidth+12),behavior:"smooth"});
  },[revealed,caseData.seed]);
  return <section className="training-card rounded-2xl p-5"><div className="flex flex-wrap items-end justify-between gap-2"><p className="training-section-title">MITRE ATT&CK INVESTIGATION PATH</p><p className="theme-muted text-[10px] font-bold tracking-[.1em]">DRAG OR SCROLL · LATEST STAYS VISIBLE</p></div><div ref={rail} className="intrusion-path mt-4" onPointerDown={(event)=>{const container=rail.current;if(!container)return;drag.current={active:true,startX:event.clientX,startLeft:container.scrollLeft};container.setPointerCapture(event.pointerId);}} onPointerMove={(event)=>{const container=rail.current;if(!container||!drag.current.active)return;container.scrollLeft=drag.current.startLeft-(event.clientX-drag.current.startX);}} onPointerUp={()=>{drag.current.active=false;}} onPointerCancel={()=>{drag.current.active=false;}}>{tactics.map((item,index)=>{const visible=index<revealed;return <div data-path-index={index} key={item.id} className={`intrusion-path-step ${visible?"is-revealed":""}`}><strong>{visible?item.tactic?.name:"???"}</strong>{visible&&<><span>{item.tactic?.technique}</span><small>{item.tactic?.evidence}</small></>}</div>;})}</div></section>;
}
function Metric({label,value}:{label:string;value:string}) { return <div className="training-result"><span>{label}</span><strong>{value}</strong></div>; }
