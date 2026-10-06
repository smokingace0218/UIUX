import { useEffect, useRef } from "react";

import { StructureFlowCollection } from "../shaders/structure-flow/StructureFlowCollection";
import "./FlowHero.css";

const SIGNATURE_WORD = "flow";

/* The headline word is poured, letter by letter. Each letter is a vessel: a
   bright liquid with a sloshing surface rises inside it, and the letter
   swells wider and bolder as it fills. As one drains the next fills, so the
   highlight is handed along the word like water poured from glass to glass.
   It runs once after the headline arrives, then every few seconds, and
   continuously while the word is hovered. */
const POUR = {
  stagger: 0.42, // seconds between one letter starting to fill and the next
  rise: 0.55,
  hold: 0.2,
  drain: 0.7,
  restMin: 3.2, // quiet time between ambient pours
  restMax: 5.2,
  firstDelay: 1.3, // lets the headline finish arriving first
};

function smooth(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function FlowWord() {
  const wordRef = useRef<HTMLSpanElement>(null);
  const hovered = useRef(false);

  useEffect(() => {
    const word = wordRef.current;
    if (!word) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const letters = Array.from(word.querySelectorAll<HTMLSpanElement>("[data-letter]"));
    const runLength = POUR.stagger * (letters.length - 1) + POUR.rise + POUR.hold + POUR.drain;
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
        if (runTime > runLength) {
          // hovering keeps the liquid moving: the next pour starts as this one ends
          runTime = hovered.current ? runTime - runLength + POUR.stagger : -1;
          nextRun = clock + POUR.restMin + Math.random() * (POUR.restMax - POUR.restMin);
        }
      }

      // the base gradient spans the whole word, so each letter shows its own slice of it
      const width = word.offsetWidth;
      letters.forEach((letter, index) => {
        let fill = 0;
        if (runTime >= 0) {
          const local = runTime - index * POUR.stagger;
          fill = smooth(local / POUR.rise) * (1 - smooth((local - POUR.rise - POUR.hold) / POUR.drain));
        }
        letter.style.setProperty("--fill", fill.toFixed(3));
        letter.style.setProperty("--slosh", (clock * 34 + index * 17).toFixed(1));
        letter.style.setProperty("--x", `${letter.offsetLeft}px`);
        letter.style.setProperty("--w", `${width}px`);
      });

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const enter = () => { hovered.current = true; };
    const leave = () => { hovered.current = false; };
    word.addEventListener("pointerenter", enter);
    word.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      word.removeEventListener("pointerenter", enter);
      word.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <span ref={wordRef} className="flow-word">
      {SIGNATURE_WORD.split("").map((letter, index) => (
        <span key={index} data-letter aria-hidden="true">{letter}</span>
      ))}
      <span className="visually-hidden">{SIGNATURE_WORD}</span>
    </span>
  );
}

export function FlowHero() {
  return (
    <section className="flow-hero" aria-labelledby="flow-hero-title">
      {/* decorative background: the pointer still reaches it, so the camera keeps its authored parallax */}
      <div className="flow-hero__bg shader-frame" aria-hidden="true">
        <StructureFlowCollection variant="dimensional-field" hue={0} saturation={1.00} brightness={1.00} />
      </div>
      <div className="flow-hero__scrim" aria-hidden="true" />

      <div className="flow-hero__content">
        <h1 id="flow-hero-title" className="flow-hero__title">
          <span className="flow-hero__line">Let your</span>
          <span className="flow-hero__line">work <FlowWord />.</span>
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
