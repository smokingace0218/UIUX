import { useEffect, useRef } from "react";

import { LiquidDimensionalField } from "./LiquidDimensionalField";
import "./FlowHero.css";

const SIGNATURE_WORD = "flow";

/* The headline word is written by one stream of liquid. A drop glides in
   from the left along a low, even path and each letter is revealed as the
   stream passes over it, swelling gently into place; at the end the drop
   slows, shrinks and settles as the full stop. Everything eases, nothing
   bounces: it should read as a current, not a ball. It plays once when the
   headline arrives and again when the word is hovered. */
type Mark = { el: HTMLElement; left: number; right: number; mid: number };

const WRITE_SECONDS = 2.1; // the stream's whole journey across the word
const SETTLE_SECONDS = 0.5; // the drop easing into the full stop

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}
function easeInOut(x: number) {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOut(x: number) {
  return 1 - Math.pow(1 - clamp01(x), 3);
}

function FlowWord() {
  const wordRef = useRef<HTMLSpanElement>(null);
  const dropRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const word = wordRef.current;
    const drop = dropRef.current;
    if (!word || !drop) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const letters = Array.from(word.querySelectorAll<HTMLElement>(".flow-word__letter"));
    const stop = word.querySelector<HTMLElement>(".flow-word__stop");
    let marks: Mark[] = [];
    let stopX = 0;
    let stopY = 0;
    let baseY = 0;
    let startX = 0;
    let frame = 0;
    let begin = 0;
    let lastEnd = -Infinity;
    let running = false;

    const measure = () => {
      const origin = word.getBoundingClientRect();
      const width = word.offsetWidth;
      marks = letters.map((el) => {
        const box = el.getBoundingClientRect();
        el.style.setProperty("--x", `${el.offsetLeft}px`);
        el.style.setProperty("--w", `${width}px`);
        // the padding around each script glyph is overhang room, not ink
        const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
        const left = box.left - origin.left + pad;
        const right = box.right - origin.left - pad;
        return { el, left, right, mid: box.top - origin.top + box.height * 0.58 };
      });
      startX = marks[0].left - 0.35 * (marks[0].right - marks[0].left);
      baseY = marks.reduce((sum, m) => sum + m.mid, 0) / marks.length;
      if (stop) {
        const box = stop.getBoundingClientRect();
        stopX = box.left - origin.left + box.width * 0.45;
        stopY = box.top - origin.top + box.height * 0.74;
      }
    };

    const reveal = (m: Mark, x: number) => {
      // the letter shows up to where the stream has reached, with a soft lead
      const p = clamp01((x - m.left) / (m.right - m.left));
      if (p >= 1) {
        m.el.style.clipPath = "";
        m.el.style.transform = "";
        return;
      }
      m.el.style.clipPath = `inset(-20% ${((1 - easeOut(p * 1.15)) * 100).toFixed(1)}% -20% -20%)`;
      m.el.style.transform = `scale(${(0.94 + 0.06 * easeOut(p)).toFixed(3)})`;
    };

    const tick = (now: number) => {
      const t = Math.max(0, (now - begin) / 1000);
      const travel = easeInOut(t / WRITE_SECONDS);
      const lastRight = marks[marks.length - 1].right;
      const endX = lastRight + (stopX - lastRight) * 0.35;

      // the stream rides a gentle, even wave through the letters' middles
      const x = startX + (endX - startX) * travel;
      const y = baseY + Math.sin(travel * Math.PI * 3) * 0.06 * (marks[0].right - marks[0].left);
      marks.forEach((m) => reveal(m, x));

      if (t < WRITE_SECONDS) {
        const speed = Math.abs(Math.sin(Math.PI * clamp01(t / WRITE_SECONDS)));
        const stretch = 1 + speed * 0.9;
        const dy = Math.cos(travel * Math.PI * 3) * 0.06 * Math.PI * 3;
        const angle = (Math.atan2(dy, 1) * 180) / Math.PI;
        drop.style.opacity = String(easeOut(t / 0.25));
        drop.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${angle.toFixed(1)}deg) scale(${stretch.toFixed(3)}, ${(1 / Math.sqrt(stretch)).toFixed(3)})`;
        if (stop) stop.style.opacity = "0";
      } else {
        // the drop eases into the full stop and becomes it
        const s = easeInOut((t - WRITE_SECONDS) / SETTLE_SECONDS);
        const dx = endX + (stopX - endX) * s;
        const dyy = y + (stopY - y) * s;
        drop.style.opacity = String(1 - s);
        drop.style.transform = `translate(${dx}px, ${dyy}px) translate(-50%, -50%) scale(${(1 - 0.55 * s).toFixed(3)})`;
        if (stop) stop.style.opacity = s.toFixed(3);
      }

      if (t < WRITE_SECONDS + SETTLE_SECONDS) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
        running = false;
        lastEnd = performance.now();
        marks.forEach((m) => { m.el.style.clipPath = ""; m.el.style.transform = ""; });
        drop.style.opacity = "0";
        if (stop) stop.style.opacity = "";
      }
    };

    const play = () => {
      if (running) return;
      running = true;
      measure();
      delete word.dataset.pending;
      marks.forEach((m) => reveal(m, -Infinity));
      begin = performance.now();
      frame = requestAnimationFrame(tick);
    };

    // hidden until the first pass writes it; the headline slides in first,
    // and the script face has to be loaded before it can be measured
    word.dataset.pending = "true";
    let first = 0;
    document.fonts.ready.then(() => { first = window.setTimeout(play, 900); });
    const replay = () => { if (performance.now() - lastEnd > 600) play(); };
    word.addEventListener("pointerenter", replay);
    const onResize = () => { if (!running) measure(); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(first);
      word.removeEventListener("pointerenter", replay);
      window.removeEventListener("resize", onResize);
      delete word.dataset.pending;
      letters.forEach((el) => { el.style.clipPath = ""; el.style.transform = ""; });
      if (stop) stop.style.opacity = "";
    };
  }, []);

  return (
    <span ref={wordRef} className="flow-word">
      {SIGNATURE_WORD.split("").map((letter, index) => (
        <span key={index} className="flow-word__letter" aria-hidden="true">{letter}</span>
      ))}
      <span className="flow-word__stop" aria-hidden="true">.</span>
      <span ref={dropRef} className="flow-drop" aria-hidden="true" />
      <span className="visually-hidden">{SIGNATURE_WORD}.</span>
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
          <span className="flow-hero__line">Let your</span>
          <span className="flow-hero__line">work <FlowWord /></span>
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
