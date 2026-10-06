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
  const baselineRef = useRef<SVGPathElement>(null);
  const hovered = useRef(false);

  useEffect(() => {
    const word = wordRef.current;
    const svg = svgRef.current;
    const text = textRef.current;
    const surface = surfaceRef.current;
    const ink = inkRef.current;
    const baseline = baselineRef.current;
    if (!word || !svg || !text || !surface || !ink || !baseline) return undefined;

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
      const step = EM / 25;
      for (let y = top; y <= bottom + step; y += step) {
        down += `${down ? " L" : "M"}${edgeAt(head, y, clock, 0).toFixed(1)} ${y.toFixed(1)}`;
      }
      for (let y = bottom + step; y >= top; y -= step) {
        up += ` L${edgeAt(tail, y, clock, 1.7).toFixed(1)} ${y.toFixed(1)}`;
      }
      surface.setAttribute("d", `${down}${up} Z`);
    };
    // the line the word sits on: flat at rest, a travelling wave while it flows
    const drawBaseline = (live: number, clock: number) => {
      const length = box.x + box.width + EM;
      const amplitude = live * 0.045 * EM;
      let d = "M0 0";
      for (let x = EM / 20; x <= length; x += EM / 20) {
        const y = amplitude * Math.sin((x / EM) * 2.6 - clock * 3.2);
        d += ` L${x.toFixed(1)} ${y.toFixed(2)}`;
      }
      baseline.setAttribute("d", d);
    };
    drawBaseline(0, 0);
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

      // while the stream runs, the lettering itself moves like liquid: the word
      // rides a baseline that rolls as a slow wave, so the joined letters sway
      // together and stay crisp vector shapes
      const live = runTime >= 0 ? Math.sin(Math.PI * Math.min(1, runTime / POUR.run)) : 0;
      drawBaseline(live, clock);

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
          {/* the baseline both layers of lettering ride on */}
          <path ref={baselineRef} id="flow-word-baseline" d="M0 0 L1000 0" />
        </defs>
        <text ref={textRef} className="flow-word__text" fontSize={EM} fill="url(#flow-word-ink)">
          <textPath href="#flow-word-baseline">{SIGNATURE_WORD}</textPath>
        </text>
        {/* the same lettering in liquid, shown only inside the travelling stream */}
        <text className="flow-word__text" fontSize={EM} fill="url(#flow-word-liquid)" clipPath="url(#flow-word-surface)">
          <textPath href="#flow-word-baseline">{SIGNATURE_WORD}</textPath>
        </text>
      </svg>
      <span className="visually-hidden">{SIGNATURE_WORD}</span>
    </span>
  );
}

/* The hero tells Flow's promise by changing behaviour, not content.

   One value, "order", runs from 0 to 1. At 0 the scene is noise: the bubbles
   move independently, the field churns, and the body copy sits behind the
   refraction, warped, softened and dim. As someone moves the cursor through
   the hero, order rises: the bubbles fall into one shared current, the field
   calms, the distortion settles and the sentence comes clear. At 1 the hero
   locks into its final state and Get Started becomes the strongest thing on
   the screen.

   independent motion = noise, coordinated motion = Flow,
   clarity = everything you need, without the noise.

   Order rises only while the pointer is moving and sinks back slowly if the
   visitor stops partway. Keyboard focus on a button jumps straight to the end
   so nobody has to wave a mouse to reach it; reduced motion starts there; and
   on touch screens, with no cursor, it resolves on its own after a beat. The
   value is shared with the background frame, which drives the bubbles and
   the field from it. */
const ORDER = {
  riseSeconds: 2.4, // seconds of continuous movement from noise to Flow
  sinkSeconds: 7, // how slowly unfinished order drains when movement stops
  movingWindow: 160, // ms after a move that still counts as moving
  touchDelay: 1800, // ms before a touch screen resolves on its own
};

function easeInOutCubic(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function useFlowOrder() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = ref.current;
    if (!section) return undefined;
    const frame = () => section.querySelector<HTMLIFrameElement>(".flow-hero__bg iframe");
    const copyBend = section.querySelector<SVGFEDisplacementMapElement>("#flow-copy-bend");
    const copyField = section.querySelector<SVGFETurbulenceElement>("#flow-copy-field");
    const copySoften = section.querySelector<SVGFEGaussianBlurElement>("#flow-copy-soften");
    const copy = section.querySelector<HTMLElement>(".flow-hero__lede");

    let progress = 0;
    let lastMove = -Infinity;
    let locked = false;
    let raf = 0;
    let last = performance.now();
    let clock = 0;
    let sent = -1;

    const apply = (order: number) => {
      section.style.setProperty("--order", order.toFixed(3));
      section.dataset.state = order >= 0.999 ? "flow" : order > 0.02 ? "settling" : "noise";
      // the copy reads as if seen through the moving bubbles until order settles it
      const noise = 1 - order;
      if (copy && copyBend && copyField && copySoften) {
        if (noise > 0.002) {
          copy.style.filter = "url(#flow-copy-refract)";
          copyBend.setAttribute("scale", (noise * 16).toFixed(2));
          copySoften.setAttribute("stdDeviation", (noise * 1.4).toFixed(2));
          copyField.setAttribute(
            "baseFrequency",
            `${(0.012 + 0.004 * Math.sin(clock * 0.9)).toFixed(4)} ${(0.05 + 0.015 * Math.sin(clock * 1.3 + 1)).toFixed(4)}`,
          );
        } else {
          copy.style.filter = "";
        }
      }
      if (Math.abs(order - sent) > 0.002 || (order >= 1 && sent < 1)) {
        sent = order;
        frame()?.contentWindow?.postMessage({ flowOrder: order }, "*");
      }
    };

    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(0.25, (now - last) / 1000));
      last = now;
      clock += dt;
      if (!locked) {
        if (now - lastMove < ORDER.movingWindow) progress += dt / ORDER.riseSeconds;
        else progress -= dt / ORDER.sinkSeconds;
        progress = Math.min(1, Math.max(0, progress));
        if (progress >= 1) locked = true;
      }
      apply(easeInOutCubic(progress));
      // once settled there is nothing left to drive; the frame keeps its own motion
      if (locked) {
        apply(1);
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const settleNow = () => {
      progress = 1;
      locked = true;
      apply(1);
    };
    const moved = () => {
      lastMove = performance.now();
    };
    // the background is its own frame; moves over it reach this page only as messages
    const onMessage = (event: MessageEvent) => {
      if (event.data && event.data.flowPointer === true) moved();
      // a frame that has just loaded asks where things stand
      if (event.data && event.data.flowHello === true) {
        sent = -1;
        apply(locked ? 1 : easeInOutCubic(progress));
      }
    };
    const onFocus = (event: FocusEvent) => {
      if ((event.target as HTMLElement).closest(".flow-hero__ctas")) settleNow();
    };

    let touchTimer = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      settleNow();
    } else {
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        // no cursor to move: let the scene resolve on its own after a beat
        touchTimer = window.setTimeout(() => {
          const start = performance.now();
          const glide = () => {
            lastMove = performance.now();
            if (!locked && performance.now() - start < ORDER.riseSeconds * 1000 + 400) requestAnimationFrame(glide);
          };
          glide();
        }, ORDER.touchDelay);
      }
      apply(0);
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", moved, { passive: true });
    window.addEventListener("message", onMessage);
    section.addEventListener("focusin", onFocus);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(touchTimer);
      window.removeEventListener("pointermove", moved);
      window.removeEventListener("message", onMessage);
      section.removeEventListener("focusin", onFocus);
      delete section.dataset.state;
      if (copy) copy.style.filter = "";
    };
  }, []);
  return ref;
}

export function FlowHero() {
  const sectionRef = useFlowOrder();
  return (
    <section ref={sectionRef} className="flow-hero" aria-labelledby="flow-hero-title">
      {/* decorative background: the pointer still reaches it, so the camera keeps its
          authored parallax and the liquid bubbles can reach toward the cursor */}
      <div className="flow-hero__bg shader-frame" aria-hidden="true">
        <LiquidDimensionalField />
      </div>
      <div className="flow-hero__scrim" aria-hidden="true" />

      {/* the refraction the body copy is seen through until the scene settles */}
      <svg className="flow-hero__defs" aria-hidden="true" focusable="false">
        <filter id="flow-copy-refract" x="-6%" y="-40%" width="112%" height="180%" colorInterpolationFilters="sRGB">
          <feTurbulence id="flow-copy-field" type="fractalNoise" baseFrequency="0.012 0.05" numOctaves={2} seed={11} result="field" />
          <feDisplacementMap id="flow-copy-bend" in="SourceGraphic" in2="field" scale={16} xChannelSelector="R" yChannelSelector="G" result="bent" />
          <feGaussianBlur id="flow-copy-soften" in="bent" stdDeviation={1.4} />
        </filter>
      </svg>

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
      </div>

    </section>
  );
}
