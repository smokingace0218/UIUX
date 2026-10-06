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
/* the logo's water drop, carried at the front of the pour: where it rides on
   each letter, as a fraction of the ink height (the ascenders of F and l sit
   high, the bowls of o and w lower), matching the logo */
const DROP_LANDING = [0.2, 0.12, 0.46, 0.46];

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
  const dropRef = useRef<SVGCircleElement>(null);
  const dropTailRef = useRef<SVGCircleElement>(null);
  const dropLayerRef = useRef<SVGGElement>(null);
  const hovered = useRef(false);

  useEffect(() => {
    const word = wordRef.current;
    const svg = svgRef.current;
    const text = textRef.current;
    const surface = surfaceRef.current;
    const ink = inkRef.current;
    const baseline = baselineRef.current;
    const drop = dropRef.current;
    const dropTail = dropTailRef.current;
    const dropLayer = dropLayerRef.current;
    if (!word || !svg || !text || !surface || !ink || !baseline || !drop || !dropTail || !dropLayer) return undefined;

    // fit the drawing to where the ink actually is, swashes included. SVG's
    // getBBox reports the font's whole line box, and this script reserves a
    // lot of empty room above and below its letters; canvas text metrics give
    // the true extent of the strokes.
    let box = { x: 0, y: -EM, width: 2.6 * EM, height: 1.3 * EM };
    // where the drop rides on each letter, in the drawing's own units
    let spots: { x: number; y: number }[] = [];
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
      // each letter's centre from the advance of the text before it
      spots = SIGNATURE_WORD.split("").map((letter, index) => {
        const before = measure.measureText(SIGNATURE_WORD.slice(0, index)).width;
        const own = measure.measureText(letter).width;
        return { x: before + own * 0.55, y: box.y + box.height * DROP_LANDING[index] };
      });
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

    // the drop glides at the front of the colour, F to w, its height following
    // the letters smoothly; a lagging droplet and the goo filter draw the pair
    // into one long drop, as in the logo
    let tailX = 0;
    let tailY = 0;
    const drawDrop = (front: number | null, clock: number, dt: number) => {
      if (front === null || spots.length < 2) {
        dropLayer.style.opacity = "0";
        return;
      }
      const first = spots[0];
      const lastSpot = spots[spots.length - 1];
      const span = lastSpot.x - first.x;
      const along = Math.min(spots.length - 1.001, Math.max(0, ((front - first.x) / span) * (spots.length - 1)));
      const k = Math.floor(along);
      const y = spots[k].y + (spots[k + 1].y - spots[k].y) * smooth(along - k);
      // sit just behind the leading edge of the colour at this height
      const x = edgeAt(front, y, clock, 0) - EM * 0.09;
      const fade = Math.min(1, (x - (first.x - span * 0.2)) / (span * 0.15), (lastSpot.x + span * 0.2 - x) / (span * 0.15));
      if (dropLayer.style.opacity === "0" || dropLayer.style.opacity === "") {
        tailX = x;
        tailY = y;
      }
      tailX += (x - tailX) * (1 - Math.exp(-dt / 0.06));
      tailY += (y - tailY) * (1 - Math.exp(-dt / 0.06));
      drop.setAttribute("cx", x.toFixed(2));
      drop.setAttribute("cy", y.toFixed(2));
      dropTail.setAttribute("cx", tailX.toFixed(2));
      dropTail.setAttribute("cy", tailY.toFixed(2));
      dropLayer.style.opacity = Math.max(0.001, Math.min(1, fade)).toFixed(3);
    };

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
        drawDrop(head, clock, dt);
      } else {
        drawStream(0, 0, clock);
        drawDrop(null, clock, dt);
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
          {/* the logo's goo: blur the drop and its droplet together, then cut the alpha sharply */}
          <filter id="flow-word-goo" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="soft" />
            <feColorMatrix in="soft" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
          </filter>
          <linearGradient id="flow-word-drop" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#5ff5df" />
            <stop offset="1" stopColor="#6fb7ff" />
          </linearGradient>
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
        <g ref={dropLayerRef} filter="url(#flow-word-goo)" style={{ opacity: 0 }}>
          <circle ref={dropTailRef} r={EM * 0.045} fill="url(#flow-word-drop)" />
          <circle ref={dropRef} r={EM * 0.066} fill="url(#flow-word-drop)" />
        </g>
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

/* lens variant: order gathers fastest near the main bubble, so the change
   reads as the visitor reaching for it rather than as any movement at all */
const LENS = {
  bubble: { x: 0.8, y: 0.56 }, // centre of the main bubble, as a fraction of the hero
  reach: 0.3, // how far its pull extends, in the same units
  floor: 0.25, // rise rate far from the bubble, relative to the rate beside it
};

type Variant = "ambient" | "lens";

/* The copy can carry two filters at once: the order's refraction and the
   travelling bubble's local lens. Each hook records its own part and this
   writes both, so neither wipes out the other. */
function composeFilter(el: HTMLElement) {
  el.style.filter = [el.dataset.orderFilter, el.dataset.lensFilter].filter(Boolean).join(" ");
}

/* the lens the travelling bubble lays over the lettering: a displacement map
   drawn once. Red and green push each point a little toward the centre, a
   gentle magnification that fades to nothing at the rim; blue marks the
   area it covers, which also lifts the text slightly there. */
function lensMap() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const image = ctx.createImageData(size, size);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const dx = (px + 0.5) / size * 2 - 1;
      const dy = (py + 0.5) / size * 2 - 1;
      const r2 = dx * dx + dy * dy;
      const inside = Math.max(0, 1 - r2);
      const bend = inside * inside;
      const i = (py * size + px) * 4;
      image.data[i] = 128 - dx * bend * 127;
      image.data[i + 1] = 128 - dy * bend * 127;
      image.data[i + 2] = bend * 255;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

/* The travelling bubble reports where it is on screen. Where it passes over
   or near the headline or the copy, they are seen through it for a moment:
   the lettering bends very slightly and the copy reads a touch brighter and
   sharper. Away from it nothing is filtered at all. */
const LENS_TARGETS = [
  { selector: ".flow-hero__name", filter: "flow-lens-title", bend: 16, lift: 1.12 },
  { selector: ".flow-hero__lede", filter: "flow-lens-copy", bend: 9, lift: 1.28 },
];

function useTravelLens(section: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const root = section.current;
    if (!root) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const map = lensMap();
    const targets = LENS_TARGETS.map((target) => ({
      ...target,
      el: root.querySelector<HTMLElement>(target.selector),
      image: root.querySelector<SVGFEImageElement>(`#${target.filter} feImage`),
      bendEl: root.querySelector<SVGFEDisplacementMapElement>(`#${target.filter} feDisplacementMap`),
      liftEl: root.querySelector<SVGFEFuncRElement>(`#${target.filter} feComponentTransfer`),
      strength: 0,
    }));
    targets.forEach((t) => t.image?.setAttribute("href", map));
    const frame = () => root.querySelector<HTMLIFrameElement>(".flow-hero__bg iframe");

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.flowLens !== true) return;
      const box = frame()?.getBoundingClientRect();
      if (!box) return;
      const cx = box.left + data.x * box.width;
      const cy = box.top + data.y * box.height;
      const r = data.r * (1 + 0.15 * (data.boost || 0));
      targets.forEach((t) => {
        if (!t.el || !t.image || !t.bendEl || !t.liftEl) return;
        const rect = t.el.getBoundingClientRect();
        // how far the bubble's rim is from the element, 1 overlapping, 0 well clear
        const gx = Math.max(rect.left - cx, 0, cx - rect.right);
        const gy = Math.max(rect.top - cy, 0, cy - rect.bottom);
        const goal = Math.max(0, Math.min(1, 1 - (Math.hypot(gx, gy) - r * 0.6) / (r * 0.6)));
        t.strength += (goal - t.strength) * 0.08;
        if (t.strength < 0.01) {
          if (t.el.dataset.lensFilter) {
            t.el.dataset.lensFilter = "";
            composeFilter(t.el);
          }
          return;
        }
        const size = r * 2;
        t.image.setAttribute("x", (cx - rect.left - r).toFixed(1));
        t.image.setAttribute("y", (cy - rect.top - r).toFixed(1));
        t.image.setAttribute("width", size.toFixed(1));
        t.image.setAttribute("height", size.toFixed(1));
        t.bendEl.setAttribute("scale", (t.bend * t.strength).toFixed(2));
        t.liftEl.querySelectorAll("feFuncR, feFuncG, feFuncB").forEach((fn) => fn.setAttribute("slope", (1 + (t.lift - 1) * t.strength).toFixed(3)));
        if (t.el.dataset.lensFilter !== `url(#${t.filter})`) {
          t.el.dataset.lensFilter = `url(#${t.filter})`;
          composeFilter(t.el);
        }
      });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [section]);
}

function useFlowOrder(variant: Variant) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = ref.current;
    if (!section) return undefined;
    const frame = () => section.querySelector<HTMLIFrameElement>(".flow-hero__bg iframe");
    const copyBend = section.querySelector<SVGFEDisplacementMapElement>("#flow-copy-bend");
    const copyField = section.querySelector<SVGFETurbulenceElement>("#flow-copy-field");
    const copySoften = section.querySelector<SVGFEGaussianBlurElement>("#flow-copy-soften");
    const copy = section.querySelector<HTMLElement>(".flow-lens__blur") ?? section.querySelector<HTMLElement>(".flow-hero__lede");
    const lens = variant === "lens";
    let proximity = 1;

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
      // in the lens variant the clear copy is revealed by the sweep, so the
      // fragmented layer underneath stays fragmented until the sweep has passed
      const noise = lens ? (order >= 0.999 ? 0 : 1 - 0.3 * order) : 1 - order;
      if (copy && copyBend && copyField && copySoften) {
        if (noise > 0.002) {
          if (copy.dataset.orderFilter !== "url(#flow-copy-refract)") {
            copy.dataset.orderFilter = "url(#flow-copy-refract)";
            composeFilter(copy);
          }
          copyBend.setAttribute("scale", (noise * 16).toFixed(2));
          copySoften.setAttribute("stdDeviation", (noise * 1.4).toFixed(2));
          copyField.setAttribute(
            "baseFrequency",
            `${(0.012 + 0.004 * Math.sin(clock * 0.9)).toFixed(4)} ${(0.05 + 0.015 * Math.sin(clock * 1.3 + 1)).toFixed(4)}`,
          );
        } else if (copy.dataset.orderFilter) {
          copy.dataset.orderFilter = "";
          composeFilter(copy);
        }
      }
      if (Math.abs(order - sent) > 0.002 || (order >= 1 && sent < 1)) {
        sent = order;
        frame()?.contentWindow?.postMessage({ flowOrder: order, flowVariant: variant }, "*");
      }
    };

    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(0.25, (now - last) / 1000));
      last = now;
      clock += dt;
      if (!locked) {
        const rate = lens ? LENS.floor + (1 - LENS.floor) * proximity : 1;
        if (now - lastMove < ORDER.movingWindow) progress += (dt / ORDER.riseSeconds) * rate;
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
    const moved = (x?: number, y?: number) => {
      lastMove = performance.now();
      if (lens && x !== undefined && y !== undefined) {
        const dx = x - LENS.bubble.x;
        const dy = y - LENS.bubble.y;
        proximity = Math.exp(-(dx * dx + dy * dy) / (LENS.reach * LENS.reach));
      }
    };
    const onPointer = (event: PointerEvent) => {
      const box = section.getBoundingClientRect();
      moved((event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height);
    };
    // the background is its own frame; moves over it reach this page only as messages
    const onMessage = (event: MessageEvent) => {
      if (event.data && event.data.flowPointer === true) moved(event.data.x, event.data.y);
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

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("message", onMessage);
    section.addEventListener("focusin", onFocus);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(touchTimer);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("message", onMessage);
      section.removeEventListener("focusin", onFocus);
      delete section.dataset.state;
      if (copy) copy.style.filter = "";
    };
  }, []);
  return ref;
}

const COPY = "Everything you need to get your work done, without the noise.";

export function FlowHero({ variant = "ambient" }: { variant?: Variant }) {
  const sectionRef = useFlowOrder(variant);
  useTravelLens(sectionRef);
  return (
    <section ref={sectionRef} className="flow-hero" data-variant={variant} aria-labelledby="flow-hero-title">
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
        {/* the travelling bubble's lens: a local displacement and lift, placed where it passes */}
        {LENS_TARGETS.map((target) => (
          <filter key={target.filter} id={target.filter} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse"
            x="-400" y="-400" width="3200" height="1600" colorInterpolationFilters="sRGB">
            <feFlood floodColor="rgb(128,128,0)" result="still" />
            <feImage preserveAspectRatio="none" result="spot" />
            <feMerge result="field">
              <feMergeNode in="still" />
              <feMergeNode in="spot" />
            </feMerge>
            <feDisplacementMap in="SourceGraphic" in2="field" scale={0} xChannelSelector="R" yChannelSelector="G" result="bent" />
            <feColorMatrix in="field" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0" result="area" />
            <feComponentTransfer in="bent" result="lifted">
              <feFuncR type="linear" slope={1} />
              <feFuncG type="linear" slope={1} />
              <feFuncB type="linear" slope={1} />
            </feComponentTransfer>
            <feComposite in="lifted" in2="area" operator="in" result="lit" />
            <feMerge>
              <feMergeNode in="bent" />
              <feMergeNode in="lit" />
            </feMerge>
          </filter>
        ))}
      </svg>

      <div className="flow-hero__content">
        <h1 id="flow-hero-title" className="flow-hero__title">
          <span className="flow-hero__line flow-hero__lead">Let your work</span>
          <span className="flow-hero__line flow-hero__name"><FlowWord /></span>
        </h1>
        {variant === "lens" ? (
          /* the sentence sits fragmented; clarity sweeps across it from the
             bubble's side and leaves it clear behind */
          <p className="flow-hero__lede flow-lens">
            <span className="flow-lens__blur">{COPY}</span>
            <span className="flow-lens__clear" aria-hidden="true">{COPY}</span>
          </p>
        ) : (
          <p className="flow-hero__lede">{COPY}</p>
        )}
        <div className="flow-hero__ctas">
          <a className="flow-button" href="#get-started">Get Started</a>
          <a className="flow-button flow-button--glass" href="#features">See how it works</a>
        </div>
        <p className="flow-hero__note">Free for personal use. No card needed.</p>
      </div>

    </section>
  );
}
