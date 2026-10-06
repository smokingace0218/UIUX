import { useEffect, useRef } from "react";

const WORD = "Flow";
/* where a drop lands on each glyph, as a fraction of the letter box height:
   the ascenders of F and l sit high, the bowls of o and w sit lower */
const LANDING = [0.2, 0.12, 0.46, 0.46];
// the drop visits the letters in this order, then loops: F l o w o l
const ROUTE = [0, 1, 2, 3, 2, 1];
const HOP_SECONDS = 0.42;

/* The brush wordmark acts out its name on hover. A drop springs out of the F
   and hops from letter to letter; each letter it lands on squashes slightly
   and lights up, then hands the light on as the drop moves to the next. A
   trailing droplet and a goo filter fuse into one stretching drop, so the
   letters read as connected by liquid. Timing is in seconds, so the frame
   rate never stretches it. */
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
    let hop = 0; // position along ROUTE, in hops
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

      const hopIndex = Math.floor(hop);
      const t = hop - hopIndex;
      // keep hopping while hovered; once the pointer leaves, finish this hop and fade
      if (active.current || t > 0.001) {
        hop += dt / HOP_SECONDS;
        if (!active.current && Math.floor(hop) > hopIndex) hop = Math.floor(hop);
      }
      presence += ((active.current ? 1 : 0) - presence) * (1 - Math.exp(-dt / (active.current ? 0.12 : 0.22)));

      const from = spots[ROUTE[hopIndex % ROUTE.length]];
      const to = spots[ROUTE[(hopIndex + 1) % ROUTE.length]];
      const ease = t * t * (3 - 2 * t);
      const lift = Math.sin(Math.PI * t) * (8 + Math.abs(to.x - from.x) * 0.25);
      const x = from.x + (to.x - from.x) * ease;
      const y = from.y + (to.y - from.y) * ease - lift;

      // the droplet lags behind, so the pair stretches mid-hop and rounds out on landing
      tailX += (x - tailX) * (1 - Math.exp(-dt / 0.06));
      tailY += (y - tailY) * (1 - Math.exp(-dt / 0.06));
      drop.setAttribute("cx", x.toFixed(2));
      drop.setAttribute("cy", y.toFixed(2));
      tail.setAttribute("cx", tailX.toFixed(2));
      tail.setAttribute("cy", tailY.toFixed(2));
      layer.style.opacity = presence.toFixed(3);

      letters.forEach((letter, index) => {
        const spot = spots[index];
        const near = Math.hypot(x - spot.x, (y - spot.y) * 0.6) / 14;
        const lit = Math.exp(-near * near) * presence;
        // squash only as the drop touches down, not while it passes overhead
        const touch = lit * Math.max(0, 1 - Math.abs(y - spot.y) / 10);
        letter.style.setProperty("--lit", lit.toFixed(3));
        letter.style.setProperty("--touch", touch.toFixed(3));
      });

      if (active.current || presence > 0.01) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
        presence = 0;
        layer.style.opacity = "0";
        letters.forEach((letter) => { letter.style.setProperty("--lit", "0"); letter.style.setProperty("--touch", "0"); });
      }
    };

    const start = () => {
      active.current = true;
      if (!frame) {
        measure();
        hop = 0;
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
            <stop offset="1" stopColor="#19d9bf" />
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
