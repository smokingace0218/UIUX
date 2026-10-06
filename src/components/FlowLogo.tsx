import { useEffect, useRef } from "react";

const WORD = "Flow";
/* where a drop lands on each glyph, as a fraction of the letter box height:
   the ascenders of F and l sit high, the bowls of o and w sit lower */
const LANDING = [0.2, 0.12, 0.46, 0.46];
const PASS_SECONDS = 1.5; // one glide from before the F to past the w

/* The brush wordmark acts out its name on hover. A drop glides through it
   along one low, even path, F to w, like a current; each letter brightens as
   the drop passes and fades as it moves on, then the drop slips away past the
   w and the next one glides in from the left. A trailing droplet and a goo
   filter fuse into one drawn-out drop. Nothing hops or squashes: it should
   read as flowing, not bouncing. Timing is in seconds, so the frame rate
   never stretches it. */
export function FlowLogo() {
  const rootRef = useRef<HTMLSpanElement>(null);
  const dropRef = useRef<SVGCircleElement>(null);
  const tailRef = useRef<SVGCircleElement>(null);
  const layerRef = useRef<SVGGElement>(null);
  const active = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    const drop = dropRef.current;
    const tail = tailRef.current;
    const layer = layerRef.current;
    if (!root || !drop || !tail || !layer) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const link = root.closest("a") ?? root;
    const letters = Array.from(root.querySelectorAll<HTMLSpanElement>("[data-letter]"));
    let spots: { x: number; y: number }[] = [];
    let presence = 0; // 0 = no drop, 1 = drop fully there
    let pass = 0; // glides through the word so far; the fraction is progress through this one
    let tailX = 0;
    let tailY = 0;
    let frame = 0;
    let last = 0;

    // landing spots in the overlay's own pixels, measured from the live glyph boxes
    const measure = () => {
      const origin = root.getBoundingClientRect();
      spots = letters.map((letter, index) => {
        const box = letter.getBoundingClientRect();
        return { x: box.left - origin.left + box.width * 0.55, y: box.top - origin.top + box.height * LANDING[index] };
      });
    };

    const tick = (now: number) => {
      // a frame's timestamp can predate the start call, so never let time run
      // backwards; capped so a tab returning from the background does not jump
      const dt = Math.max(0, Math.min(0.25, (now - last) / 1000));
      last = now;

      // keep gliding while hovered; once the pointer leaves, finish this pass and fade
      if (active.current || pass % 1 > 0.001) {
        const before = Math.floor(pass);
        pass += dt / PASS_SECONDS;
        if (!active.current && Math.floor(pass) > before) pass = Math.floor(pass);
      }
      presence += ((active.current ? 1 : 0) - presence) * (1 - Math.exp(-dt / (active.current ? 0.15 : 0.3)));

      // position along the word: from a little before the F to a little past the w
      const u = pass % 1;
      const ease = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      const first = spots[0];
      const lastSpot = spots[spots.length - 1];
      const span = lastSpot.x - first.x;
      const x = first.x - span * 0.25 + span * 1.5 * ease;
      // height follows the letters smoothly, interpolated between their landing spots
      const along = Math.min(spots.length - 1.001, Math.max(0, ((x - first.x) / span) * (spots.length - 1)));
      const k = Math.floor(along);
      const f = along - k;
      const blend = f * f * (3 - 2 * f);
      const y = spots[k].y + (spots[k + 1].y - spots[k].y) * blend;
      // fade in at the start of each glide and out at its end, so the loop has no seam
      const edge = Math.min(1, u / 0.12, (1 - u) / 0.12);

      // the droplet lags behind, so the pair draws out into one long drop as it glides
      tailX += (x - tailX) * (1 - Math.exp(-dt / 0.06));
      tailY += (y - tailY) * (1 - Math.exp(-dt / 0.06));
      drop.setAttribute("cx", x.toFixed(2));
      drop.setAttribute("cy", y.toFixed(2));
      tail.setAttribute("cx", tailX.toFixed(2));
      tail.setAttribute("cy", tailY.toFixed(2));
      layer.style.opacity = (presence * edge).toFixed(3);

      letters.forEach((letter, index) => {
        const spot = spots[index];
        const near = (x - spot.x) / 16;
        const lit = Math.exp(-near * near) * presence * edge;
        letter.style.setProperty("--lit", lit.toFixed(3));
      });

      if (active.current || presence > 0.01) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
        presence = 0;
        layer.style.opacity = "0";
        letters.forEach((letter) => letter.style.setProperty("--lit", "0"));
      }
    };

    const start = () => {
      active.current = true;
      if (!frame) {
        measure();
        pass = 0;
        tailX = spots[0].x;
        tailY = spots[0].y;
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    const stop = () => { active.current = false; };

    link.addEventListener("pointerenter", start);
    link.addEventListener("pointerleave", stop);
    link.addEventListener("focus", start);
    link.addEventListener("blur", stop);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      link.removeEventListener("pointerenter", start);
      link.removeEventListener("pointerleave", stop);
      link.removeEventListener("focus", start);
      link.removeEventListener("blur", stop);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <span ref={rootRef} className="flow-logo">
      <span className="flow-logo__word" aria-hidden="true">
        {WORD.split("").map((letter, index) => <span key={index} data-letter>{letter}</span>)}
      </span>
      <svg className="flow-logo__drops" aria-hidden="true" focusable="false">
        <defs>
          {/* blur the drops together, then cut the alpha sharply: two circles fuse into one liquid shape */}
          <filter id="flow-goo" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="soft" />
            <feColorMatrix in="soft" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
          </filter>
          <linearGradient id="flow-drop-tide" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#5ff5df" />
            <stop offset="1" stopColor="#6fb7ff" />
          </linearGradient>
        </defs>
        <g ref={layerRef} filter="url(#flow-goo)" style={{ opacity: 0 }}>
          <circle ref={tailRef} r="2.3" fill="url(#flow-drop-tide)" />
          <circle ref={dropRef} r="3.4" fill="url(#flow-drop-tide)" />
        </g>
      </svg>
    </span>
  );
}
