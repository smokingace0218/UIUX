import { useEffect, useRef, type PointerEvent } from "react";

import { StructureFlowCollection } from "../shaders/structure-flow/StructureFlowCollection";
import "./FlowHero.css";

const SIGNATURE_WORD = "flow";

/* "flow" swells under the pointer like a lens of the glass behind it: each
   letter's width and weight follow its distance from the cursor, eased per
   frame so the swell drifts rather than snaps. */
function FlowWord() {
  const wordRef = useRef<HTMLSpanElement>(null);
  const target = useRef<number | null>(null);

  useEffect(() => {
    const word = wordRef.current;
    if (!word) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const letters = Array.from(word.querySelectorAll<HTMLSpanElement>("[data-letter]"));
    const swell = letters.map(() => 0);
    let frame = 0;

    const tick = () => {
      const pointer = target.current;
      letters.forEach((letter, index) => {
        let goal = 0;
        if (pointer !== null) {
          const box = letter.getBoundingClientRect();
          const distance = Math.abs(pointer - (box.left + box.width / 2)) / box.height;
          goal = Math.exp(-distance * distance * 2.2);
        }
        swell[index] += (goal - swell[index]) * 0.12;
        letter.style.setProperty("--swell", swell[index].toFixed(3));
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <span
      ref={wordRef}
      className="flow-word"
      onPointerMove={(event: PointerEvent) => { target.current = event.clientX; }}
      onPointerLeave={() => { target.current = null; }}
    >
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
          Flow connects the tools your team already uses and moves every request to its next step.
          Approvals, updates and follow-ups happen without anyone chasing them.
        </p>
        <div className="flow-hero__ctas">
          <a className="flow-button" href="#start">Start free</a>
          <a className="flow-button flow-button--glass" href="#how-it-works">See how it works</a>
        </div>
        <p className="flow-hero__note">Free for 14 days. No card needed.</p>
      </div>

      <p className="flow-hero__connects">
        Works with Slack, Gmail, Salesforce, Notion, Linear and 240 more apps
      </p>
    </section>
  );
}
