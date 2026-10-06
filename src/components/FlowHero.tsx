import { useEffect, useRef } from "react";

import { LiquidDimensionalField } from "./LiquidDimensionalField";
import "./FlowHero.css";

const SIGNATURE_WORD = "Flow";

/* "Flow" is one piece of lettering, never split into letters: the brush
   script joins its letters, and moving them separately breaks the joins. It
   is drawn as SVG text twice over: once in the cyan-to-violet ink, and once
   in a bright liquid clipped to a travelling stream. The stream runs the way
   the word is written: it starts at the tip of the F, flows on into the l,
   through the o and out along the w, with a wavy leading edge slanted like
   the script, and the colour drains away behind it in the same direction.
   It runs once after the headline arrives, then every few seconds, and
   continuously while the word is hovered. */
const POUR = {
  run: 2.4, // seconds for one swell to travel through the word
  restMin: 3.2, // quiet time between ambient pours
  restMax: 5.2,
  firstDelay: 1.3, // lets the headline finish arriving first
};
const EM = 100; // the lettering is drawn at 100 user units to the em

function smooth(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function FlowWord() {
  const wordRef = useRef<HTMLSpanElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const surfaceRef = useRef<SVGPathElement>(null);
  const inkRef = useRef<SVGLinearGradientElement>(null);
  const hovered = useRef(false);

  useEffect(() => {
    const word = wordRef.current;
    const svg = svgRef.current;
    const text = textRef.current;
    const surface = surfaceRef.current;
    const ink = inkRef.current;
    if (!word || !svg || !text || !surface || !ink) return undefined;

    // fit the drawing to where the ink actually is, swashes included. SVG's
    // getBBox reports the font's whole line box, and this script reserves a
    // lot of empty room above and below its letters; canvas text metrics give
    // the true extent of the strokes.
    let box = { x: 0, y: -EM, width: 2.6 * EM, height: 1.3 * EM };
    const measure = document.createElement("canvas").getContext("2d");
    const fit = () => {
      if (!measure) return;
      measure.font = `${EM}px ${getComputedStyle(text).fontFamily}`;
      const m = measure.measureText(SIGNATURE_WORD);
      const width = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      if (!width) return;
      const pad = 0.05 * EM;
      box = {
        x: -m.actualBoundingBoxLeft - pad,
        y: -m.actualBoundingBoxAscent - pad,
        width: width + 2 * pad,
        height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + 2 * pad,
      };
      svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);
      svg.style.width = `${box.width / EM}em`;
      svg.style.height = `${box.height / EM}em`;
      ink.setAttribute("x1", String(box.x));
      ink.setAttribute("x2", String(box.x + box.width));
    };
    fit();
    document.fonts.ready.then(fit);
    document.fonts.addEventListener("loadingdone", fit);

    // the stream: the region between a draining tail and a leading head, both
    // moving left to right. Each edge leans with the script's slant and ripples,
    // so the colour reads as running along the strokes, not rising from below.
    const SLANT = 0.32; // the edge leans right toward the top, like the lettering
    const edgeAt = (front: number, y: number, clock: number, phase: number) => {
      const mid = box.y + box.height / 2;
      return front - (y - mid) * SLANT + Math.sin(y * 0.11 + clock * 4 + phase) * 0.025 * box.width;
    };
    const drawStream = (head: number, tail: number, clock: number) => {
      if (head <= tail) {
        surface.setAttribute("d", `M${box.x} ${box.y} Z`);
        return;
      }
      const top = box.y;
      const bottom = box.y + box.height;
      let down = "";
      let up = "";
      for (let y = top; y <= bottom + 4; y += 4) {
        down += `${down ? " L" : "M"}${edgeAt(head, y, clock, 0).toFixed(1)} ${y.toFixed(1)}`;
      }
      for (let y = bottom + 4; y >= top; y -= 4) {
        up += ` L${edgeAt(tail, y, clock, 1.7).toFixed(1)} ${y.toFixed(1)}`;
      }
      surface.setAttribute("d", `${down}${up} Z`);
    };
    drawStream(0, 0, 0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => document.fonts.removeEventListener("loadingdone", fit);
    }

    let runTime = -1; // seconds into the current pour, or -1 when resting
    let nextRun = POUR.firstDelay;
    let clock = 0;
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      // never let time run backwards; capped so a returning tab does not jump
      const dt = Math.max(0, Math.min(0.25, (now - last) / 1000));
      last = now;
      clock += dt;

      if (runTime < 0 && (clock >= nextRun || hovered.current)) runTime = 0;
      if (runTime >= 0) {
        runTime += dt;
        if (runTime > POUR.run) {
          runTime = hovered.current ? 0 : -1;
          nextRun = clock + POUR.restMin + Math.random() * (POUR.restMax - POUR.restMin);
        }
      }

      if (runTime >= 0) {
        // the head runs from before the F's tip to past the w; the tail follows
        // a beat behind, so the colour flows in letter by letter and drains the
        // same way. The overshoot covers the slant of the edges at both ends.
        const p = runTime / POUR.run;
        const start = box.x - box.width * 0.25;
        const span = box.width * 1.5;
        const head = start + span * smooth(p / 0.72);
        const tail = start + span * smooth((p - 0.3) / 0.7);
        drawStream(head, tail, clock);
      } else {
        drawStream(0, 0, clock);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const enter = () => { hovered.current = true; };
    const leave = () => { hovered.current = false; };
    word.addEventListener("pointerenter", enter);
    word.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      document.fonts.removeEventListener("loadingdone", fit);
      word.removeEventListener("pointerenter", enter);
      word.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <span ref={wordRef} className="flow-word">
      <svg ref={svgRef} className="flow-word__art" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient ref={inkRef} id="flow-word-ink" gradientUnits="userSpaceOnUse" x1="0" x2="260" y1="0" y2="0">
            <stop offset="0.04" stopColor="#19d9bf" />
            <stop offset="0.5" stopColor="#6fb7ff" />
            <stop offset="0.96" stopColor="#7a3cff" />
          </linearGradient>
          <linearGradient id="flow-word-liquid" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.45" stopColor="#d9fff8" />
            <stop offset="1" stopColor="#63f2dc" />
          </linearGradient>
          <clipPath id="flow-word-surface">
            <path ref={surfaceRef} />
          </clipPath>
        </defs>
        <text ref={textRef} className="flow-word__text" x="0" y="0" fill="url(#flow-word-ink)">{SIGNATURE_WORD}</text>
        {/* the same lettering in liquid, shown only inside the travelling stream */}
        <text className="flow-word__text" x="0" y="0" fill="url(#flow-word-liquid)" clipPath="url(#flow-word-surface)">{SIGNATURE_WORD}</text>
      </svg>
      <span className="visually-hidden">{SIGNATURE_WORD}</span>
    </span>
  );
}

export function FlowHero() {
  return (
    <section className="flow-hero" aria-labelledby="flow-hero-title">
      {/* decorative background: the pointer still reaches it, so the camera keeps its
          authored parallax and the liquid bubbles can reach toward the cursor */}
      <div className="flow-hero__bg shader-frame" aria-hidden="true">
        <LiquidDimensionalField />
      </div>
      <div className="flow-hero__scrim" aria-hidden="true" />

      <div className="flow-hero__content">
        <h1 id="flow-hero-title" className="flow-hero__title">
          <span className="flow-hero__line flow-hero__lead">Let your work</span>
          <span className="flow-hero__line flow-hero__name"><FlowWord /></span>
        </h1>
        <p className="flow-hero__lede">
          Everything you need to get your work done, without the noise.
        </p>
        <div className="flow-hero__ctas">
          <a className="flow-button" href="#get-started">Get Started</a>
          <a className="flow-button flow-button--glass" href="#features">See how it works</a>
        </div>
        <p className="flow-hero__note">Free for personal use. No card needed.</p>
      </div>

    </section>
  );
}
