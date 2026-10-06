import { useEffect, useRef } from "react";

const WORD = "Flow";
const WAVE_PERIOD = 22; // one crest and trough of the mark's wave, in its viewBox units

/* The logo acts out the name: hover it and a current runs through it. The
   wave in the mark starts to move and a swell travels through the letters,
   widening, lifting and tinting each one as it passes. When the pointer
   leaves, the current runs down instead of stopping dead. */
export function FlowLogo() {
  const rootRef = useRef<HTMLSpanElement>(null);
  const waveRef = useRef<SVGGElement>(null);
  const active = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    const wave = waveRef.current;
    if (!root || !wave) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const link = root.closest("a") ?? root;
    const letters = Array.from(root.querySelectorAll<HTMLSpanElement>("[data-letter]"));
    let speed = 0;
    let phase = 0;
    let frame = 0;
    let last = 0;

    const tick = (now: number) => {
      // capped only so a tab returning from the background does not jump
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      // the current picks up quickly and settles a little slower, timed in
      // seconds so a slow or throttled frame rate never stretches it out
      const ease = active.current ? 0.22 : 0.3;
      speed += ((active.current ? 1 : 0) - speed) * (1 - Math.exp(-dt / ease));
      phase += dt * speed * 5.5;

      wave.setAttribute("transform", `translate(${-((phase * 3.2) % WAVE_PERIOD)} 0)`);
      letters.forEach((letter, index) => {
        const crest = Math.max(0, Math.sin(phase - index * 0.85));
        letter.style.setProperty("--swell", (crest * crest * speed).toFixed(3));
      });

      if (active.current || speed > 0.01) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
        letters.forEach((letter) => letter.style.setProperty("--swell", "0"));
      }
    };

    const start = () => {
      active.current = true;
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    const stop = () => { active.current = false; };

    link.addEventListener("pointerenter", start);
    link.addEventListener("pointerleave", stop);
    link.addEventListener("focus", start);
    link.addEventListener("blur", stop);
    return () => {
      cancelAnimationFrame(frame);
      link.removeEventListener("pointerenter", start);
      link.removeEventListener("pointerleave", stop);
      link.removeEventListener("focus", start);
      link.removeEventListener("blur", stop);
    };
  }, []);

  return (
    <span ref={rootRef} className="flow-logo">
      <svg className="flow-mark" viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="flow-mark-tide" x1="5" x2="27" y1="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#19d9bf" />
            <stop offset="1" stopColor="#7a3cff" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeOpacity="0.35" />
        {/* the wave is a mask over a fixed gradient: the line moves, its colours stay put */}
        <mask id="flow-mark-wave" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <g ref={waveRef}>
            {/* the wave runs a full period past both edges, so sliding it by one period loops seamlessly */}
            <path
              d="M-17 18c4-6 8-6 11 0s7 6 11 0s7-6 11 0s7 6 11 0s7-6 11 0s7 6 11 0s7-6 11 0s7 6 11 0"
              fill="none"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </g>
        </mask>
        <circle cx="16" cy="16" r="13.2" fill="url(#flow-mark-tide)" mask="url(#flow-mark-wave)" />
      </svg>
      <span className="flow-logo__word" aria-hidden="true">
        {WORD.split("").map((letter, index) => <span key={index} data-letter>{letter}</span>)}
      </span>
    </span>
  );
}
