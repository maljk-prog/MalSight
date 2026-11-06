"use client";

import { useEffect, useRef, useState } from "react";

const W = 800, H = 400, PADDLE = 76, R = 7;
const clamp = (y: number) => Math.max(PADDLE / 2, Math.min(H - PADDLE / 2, y));

export default function CoolerPong() {
  const court = useRef<SVGSVGElement>(null);
  const player = useRef<SVGRectElement>(null);
  const opponent = useRef<SVGRectElement>(null);
  const ball = useRef<SVGRectElement>(null);
  const game = useRef({ x: W / 2, y: H / 2, vx: 300, vy: 120, py: H / 2, ai: H / 2, wait: 0 });
  const keys = useRef({ up: false, down: false });
  const dragging = useRef<number | null>(null);
  const [phase, setPhase] = useState<"ready" | "playing" | "paused" | "finished">("ready");
  const [score, setScore] = useState([0, 0]);
  const scoreRef = useRef([0, 0]);

  function serve(direction = 1) {
    Object.assign(game.current, { x: W / 2, y: H / 2, vx: direction * 300, vy: (Math.random() > .5 ? 1 : -1) * 120, wait: .65 });
  }

  function reset() {
    scoreRef.current = [0, 0];
    setScore([0, 0]);
    Object.assign(game.current, { py: H / 2, ai: H / 2 });
    serve();
    setPhase("playing");
  }

  useEffect(() => {
    let frame = 0, previous = 0;
    const paint = () => {
      const g = game.current;
      player.current?.setAttribute("y", String(g.py - PADDLE / 2));
      opponent.current?.setAttribute("y", String(g.ai - PADDLE / 2));
      ball.current?.setAttribute("x", String(g.x - R));
      ball.current?.setAttribute("y", String(g.y - R));
    };
    const tick = (now: number) => {
      const dt = previous ? Math.min((now - previous) / 1000, .025) : 0;
      previous = now;
      const g = game.current;
      if (phase === "playing") {
        g.py = clamp(g.py + (Number(keys.current.down) - Number(keys.current.up)) * 390 * dt);
        // Limited speed and a small aiming offset keep the opponent beatable.
        const target = g.vx > 0 ? g.y + Math.sin(now / 550) * 25 : H / 2;
        g.ai = clamp(g.ai + Math.max(-210 * dt, Math.min(210 * dt, target - g.ai)));
        if (g.wait > 0) g.wait -= dt;
        else {
          const oldX = g.x;
          g.x += g.vx * dt;
          g.y += g.vy * dt;
          if (g.y < R || g.y > H - R) {
            g.y = Math.max(R, Math.min(H - R, g.y));
            g.vy *= -1;
          }
          const leftHit = g.vx < 0 && oldX >= 40 + R && g.x <= 40 + R && Math.abs(g.y - g.py) <= PADDLE / 2 + R;
          const rightHit = g.vx > 0 && oldX <= W - 40 - R && g.x >= W - 40 - R && Math.abs(g.y - g.ai) <= PADDLE / 2 + R;
          if (leftHit || rightHit) {
            const offset = (g.y - (leftHit ? g.py : g.ai)) / (PADDLE / 2 + R);
            const speed = Math.min(580, Math.hypot(g.vx, g.vy) + 24);
            g.vx = (leftHit ? 1 : -1) * speed * Math.cos(offset * .95);
            g.vy = speed * Math.sin(offset * .95);
            g.x = leftHit ? 40 + R : W - 40 - R;
          }
          if (g.x < -R || g.x > W + R) {
            const next = [...scoreRef.current];
            next[g.x > W ? 0 : 1] += 1;
            scoreRef.current = next;
            setScore(next);
            serve(g.x > W ? -1 : 1);
            if (Math.max(...next) >= 7) setPhase("finished");
          }
        }
      }
      paint();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const pause = () => {
      keys.current = { up: false, down: false };
      dragging.current = null;
      if (document.hidden) setPhase(current => current === "playing" ? "paused" : current);
    };
    document.addEventListener("visibilitychange", pause);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", pause); };
  }, [phase]);

  function move(clientY: number) {
    const bounds = court.current?.getBoundingClientRect();
    if (bounds) game.current.py = clamp((clientY - bounds.top) / bounds.height * H);
  }

  return (
    <section className="cooler-pong my-6 overflow-hidden rounded-2xl border border-[#8DA99B]/60 bg-[#13231D] p-4 text-[#E6E4DE] shadow-xl sm:p-6" aria-labelledby="pong-title">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[.24em] text-[#A4C5B4]">THE BREAK ROOM · EST. 1972</p>
          <h3 id="pong-title" className="mt-2 text-3xl font-black">Cooler Pong</h3>
          <p className="mt-1 text-sm text-[#B7CABC]">Grab a paddle. Give your brain a coffee break.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => phase === "ready" || phase === "finished" ? reset() : setPhase(phase === "playing" ? "paused" : "playing")} className="pong-play rounded-full px-5 py-2 text-sm font-bold">
            {phase === "ready" ? "Play Pong" : phase === "finished" ? "Play again" : phase === "playing" ? "Pause" : "Resume"}
          </button>
          {phase !== "ready" && <button type="button" onClick={reset} className="pong-restart rounded-full border border-[#8DA99B] px-4 py-2 text-sm font-bold hover:bg-white/10">Restart</button>}
        </div>
      </div>
      <div className="mb-3 flex justify-between font-mono text-sm font-bold" aria-live="polite" aria-atomic="true">
        <span>YOU <span className="ml-3 text-2xl text-[#D7FBA3]">{score[0]}</span></span>
        <span className="self-center text-xs text-[#A4C5B4]">FIRST TO 7</span>
        <span><span className="mr-3 text-2xl">{score[1]}</span> AI</span>
      </div>
      <div className="relative">
        <svg ref={court} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="application" aria-label="Pong court. Drag to move your left paddle, or use the Up and Down arrow keys. First to seven wins." tabIndex={0}
          className="block aspect-[2/1] w-full touch-none cursor-ns-resize rounded-xl border border-[#8DA99B]/50 bg-[#09140F] outline-none focus-visible:ring-2 focus-visible:ring-[#D7FBA3]"
          onPointerDown={e => { if (dragging.current !== null) return; dragging.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.focus(); move(e.clientY); }}
          onPointerMove={e => { if (dragging.current === e.pointerId) move(e.clientY); }}
          onPointerUp={e => { if (dragging.current === e.pointerId) dragging.current = null; }}
          onPointerCancel={() => { dragging.current = null; }}
          onLostPointerCapture={() => { dragging.current = null; }}
          onKeyDown={e => { if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); keys.current[e.key === "ArrowUp" ? "up" : "down"] = true; } }}
          onKeyUp={e => { if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); keys.current[e.key === "ArrowUp" ? "up" : "down"] = false; } }}
          onBlur={() => { keys.current = { up: false, down: false }; }}>
          <path d="M400 12V388" stroke="#8DA99B" strokeOpacity=".35" strokeWidth="3" strokeDasharray="8 12" />
          <rect ref={player} x="28" y="162" width="12" height={PADDLE} rx="3" fill="#D7FBA3" />
          <rect ref={opponent} x="760" y="162" width="12" height={PADDLE} rx="3" fill="#C8DDD2" />
          <rect ref={ball} x="393" y="193" width={R * 2} height={R * 2} fill="#F5F4EF" />
        </svg>
        {phase !== "playing" && <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-[#09140F]/65 text-center">
          <div className="px-6"><p className="text-2xl font-black sm:text-4xl">{phase === "ready" ? "A little friendly competition?" : phase === "paused" ? "Coffee break." : score[0] >= 7 ? "You win. Cooler champion!" : "AI takes this round."}</p><p className="mt-3 text-sm text-[#C8DDD2]">{phase === "ready" ? "Hit Play Pong to start." : phase === "paused" ? "Hit Resume when you’re ready." : "There’s always time for a rematch."}</p></div>
        </div>}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[#B7CABC]">You’re on the left. Drag your paddle up and down with a mouse or finger anywhere on the court. Keyboard: focus the court and use ↑ / ↓.</p>
    </section>
  );
}
