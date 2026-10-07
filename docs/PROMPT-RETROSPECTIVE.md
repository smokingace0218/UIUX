# Prompt retrospective: how this build could have taken a few prompts

This document looks back over the whole Flow session. I started from the ThreeUI *Dimensional Field* code (threeui.com/three-js/structure-flow/dimensional-field) and finished with the published hero. For each phase it records:

- what was asked;
- what happened;
- why it took several rounds;
- the prompt that would have got the final result in one go.

Part 2 then gives the complete prompt sequence that rebuilds today's final output from the raw ThreeUI code.

---

## Part 1: what happened, phase by phase

Across the session the hero went through more than 20 published versions, plus a variant built, revised and deleted. Most of those rounds came from four causes:

- the brief arriving after the build had started;
- describing a feeling instead of a behaviour;
- discovering what I wanted by reacting to builds;
- delivery problems that a constraint stated up front would have prevented.

| # | Phase | What I asked | What happened | Root cause | One prompt that would have done it |
|---|---|---|---|---|---|
| 1 | **Getting the source** | Pasted a 13-effect "family" skill, then asked to integrate the collection; pasted a 3-file bundle; "if the source can't be retrieved, stop" | Claude integrated a whole collection, checked hashes and dealt with missing files, all for one effect | Gave everything instead of the one thing needed | "Here is one effect, `vanguard-dimensional.html`. Use it unmodified as the background." |
| 2 | **Scope** | "Make the hero… using this as bg", then "fully responsive webpage", then "just the hero, no section below" | A six-section landing page was built, then cut back | "Webpage" was read as a whole site; scope was set after the build | "Desktop hero only, still usable on a phone. Nothing below it." |
| 3 | **The brief** | Sent the assignment brief *after* the first build ("go through this explicitly") | Copy invented for an automation product had to be replaced | The brief came after the build | Send the brief first: the copy, CTA and fictional product, verbatim. |
| 4 | **Bubbles reacting** | "On hover the bg is not interacting… you know how it should work" | The cause turned out to be a CSS rule (`pointer-events: none` inherited) | A behaviour assumed, not stated | "The bubbles must respond to the cursor; the background wrapper needs `pointer-events: auto`." |
| 5 | **Typography and logo** | Butter as reference → "logo starts flowing on hover" → "same as Butter" → letters "interconnected through drops" → "abstract, not flowy" → "bouncy, not flowy" → "not readable, I liked the previous one" → "same typography as the logo" → font-pairing exploration → "letters breaking" → "colour flows F→l→o→w" → "let the alphabet flow" | Over a dozen rounds: several typefaces, a split-letter build that broke the script joins, a bounce that had to become a glide | Discovering the look by reacting; adjectives ("flowy", "interesting") instead of specs | See Prompt 3 in Part 2: Mr Dafoe, one joined SVG word, a colour pour F→w, a drop that glides and never bounces. |
| 6 | **Liquid bubbles** | "Rigid… make it flowy", "forms an arch", "sharp on interaction", "drift away and expand", "background always present", "real refraction, not inside the bubbles", "regain the arch" | About seven rounds, one per symptom | Each fix exposed the next issue; the full behaviour was never stated at once | See Prompt 2 in Part 2: one complete bubble spec. |
| 7 | **The hero's story** | First "buttons appear on movement, hide when idle"; later the full noise → Flow sequence | A behaviour built, then replaced | The core idea arrived late | State noise → Flow as the concept in the first brief. |
| 8 | **Small refinements** | Logo in the headline colours → then "white, fills on hover"; gradient ring on Get Started → "remove the stroke inside" | Each needed a rebuild and a republish | Decided one property at a time | Batch every detail into one prompt with exact values. |
| 9 | **The variant** | Lens variant → travelling bubble → bounce → edge-bubble loops → revert the original → delete the variant | Two pages, a shared-code split, then a full rollback | Exploring in production code | Decide on the direction first. If exploring, ask for a *description* or a throwaway branch, not a published build. |
| 10 | **Delivery** | "Artifacts are not playing", "Flow comes as not found" | A multi-file build and a logo linking to "/" broke the preview | Delivery constraints never stated | "Single JS and CSS bundle; the logo reloads the page; never link to the site root." |
| 11 | **Verification** | "No screenshots" (late) | Many screenshots taken, each adding to the conversation | No verification budget set | Set a budget up front: "one headless check, no screenshots unless I ask". |

### The pattern

- **Rounds are cheap to start but expensive to stack.** Every message re-sends the whole conversation, so round 20 costs far more than round 2.
- **Adjectives cost rounds; numbers don't.** "Flowy", "smooth" and "interesting" each took 2–4 tries. "Glides along one path, 1.5 s, no hop" takes one.
- **Order matters.** Brief, then scope, then concept, then details. Changing an earlier layer invalidates everything built on it.

---

## Part 2: the prompt sequence that builds today's final from the raw ThreeUI code

Five prompts, sent one at a time. Each states its purpose, every decision, and how to check it.

### Prompt 0: brief and rules

```
Brief: a desktop landing-page hero (still usable on a phone) for "Flow", a fictional
productivity app. Hero only; nothing below it. Don't invent product features,
dashboards or icons.
- Copy, exact: "Everything you need to get your work done, without the noise."
- Primary CTA: Get Started. Secondary: See how it works.
- Concept: the page acts out the tagline. It opens busy (noise); the visitor's
  movement settles it (Flow); it ends with the copy sharp and Get Started as the
  clearest action.
- Look: Mr Dafoe (logo and "Flow") with Geist; palette #19d9bf → #6fb7ff → #7a3cff
  on #050608. Motion glides, never bounces.

Rules: Vite + React + TypeScript, base './', one JS and one CSS bundle. Build only
what I specify; no alternatives, no questions. Verify with a quiet build and at most
one headless check per prompt; no screenshots. Reply in 3 lines. Commit each prompt.
```

### Prompt 1: the background as given

```
Attached: vanguard-dimensional.html (ThreeUI "Dimensional Field"). Store it unmodified.
Render it full-bleed behind the hero in a sandboxed srcdoc iframe that shows only its
canvas. The wrapper is position:absolute, inset:0, z-index:-2, pointer-events:auto.
Make every later change as string transforms on anchors in this file at load time;
if an anchor is missing, fall back to the original.
```

### Prompt 2: the background becomes liquid glass (the tweaks, all at once)

```
Transform the background (anchors in the source):
1. Glass: replace the sphere fragment shader. Each bubble is clear: it re-samples
   the background field behind it (the same noise steps as the background shader),
   bent by the normal: bend = n.xy*(0.05+0.12*fresnel)*(1-0.35*u_order). Add a
   thin-film rim (cosine palette on fresnel, ×0.38), a highlight (pow 220, ×0.75),
   and almost no tint in the centre.
2. Liquid: replace the sphere vertex shader. A gentle wobble of 0.045*(1-0.45*u_order)
   at time×0.8, plus a swell along the normal that depends on distance from the
   pointer only: u_pull*exp(-d²*0.06)*0.55. Never move toward the pointer's
   direction (that makes points).
3. Pointer: track mousemove on the z=0 plane. u_pull eases in while the pointer
   moves (0.35 s) and out after 1.2 s still (0.6 s). Post {flowPointer:true} to the
   parent at most every 200 ms.
4. Bubbles: a bubble near the cursor eases away from it (0.7 s spring), grows 7%,
   and floats back. Each visible bubble also wanders in a bounded area on unrelated
   frequencies (reach x 0.9/1.1/1.9, y 0.6/0.8/1.4 for large/bottom-left/small).
   Use time-based easing and clamp dt to 0–0.25 s.
5. Beams always present: beam = 0.3 + 0.7*smoothstep(-0.45, 0.9, …).
6. Order: listen for {flowOrder: 0..1} and post {flowHello} on load. Ease u_order
   with a 0.6 s time constant. As it rises: field turbulence 0.4 → 0.22, the
   scene clock slows by up to 45%, and the bubbles blend into one shared current
   (y = baseY + sin(t*0.55)*0.5, sway sin(t*0.21)).
```

### Prompt 3: header, logo and headline

```
Header: the logo on the left; a centre pill nav (Features, Pricing, Download); Sign in
and a white Get Started on the right; a mobile menu sheet.

Logo: "Flow" in Mr Dafoe, white. On hover a drop glides through it F→w (1.5 s per
pass, looping): a drop plus a lagging droplet, fused by a goo filter (blur 1.6,
alpha 0 0 0 20 -8), at letter heights 0.2/0.12/0.46/0.46. Each letter fills as the
drop reaches it and stays filled while hovered (F #28d3ca, l #59c0ee, o #7297ff,
w #7851ff), with a faint glow under the drop; on leave it drains to white.
Click: preventDefault + location.reload(); never href="/".

Headline: "LET YOUR WORK" in tracked uppercase Geist. Below it, "Flow" in Mr Dafoe at
clamp(7.5rem, 16.5vw, 19rem), as ONE SVG <text><textPath> so the joins never
break, filled with the palette gradient, with the viewBox fitted to the ink by
canvas measureText. A pour: a bright copy (white → #63f2dc) clipped to a slanted,
wavy stream runs F→w in 2.4 s, at 1.3 s after load, then every 3.2–5.2 s, and
looping on hover. The baseline rolls as a gentle wave during a pour. The logo's
drop rides just behind the front of the stream.
```

### Prompt 4: copy, buttons and noise → Flow

```
Copy (exact) in Geist 300, max width 34ch, then Get Started (white) and See how it
works (glass). Nothing below the buttons. Get Started on hover/focus: a 1.5 px
gradient ring 4 px outside it plus a halo (blur 14, opacity 0.22); no inner stroke.

Order 0→1, shared with the background: it rises over 2.4 s of pointer movement (page
or flowPointer), sinks over 7 s when still, locks at 1, eased. Answer flowHello.
Set --order and data-state (noise/settling/flow) on the hero.
- Copy: an SVG filter (turbulence + displacement up to 16 + blur up to 1.4) × (1 − order),
  removed at 1; opacity 0.42 → 1.
- At 1: Get Started scale 1.06 with a teal/violet glow; secondary at 0.62.
- CTA focus, reduced motion, or touch (after 1.8 s) settles straight to 1.

Then one headless check: load, two reloads and a logo click each draw the canvas
with a clean console. Publish as an artifact and give me the link.
```

### Prompt 5: the record

```
Write docs/PROCESS.md (under 100 lines): the brief and concept, the background's
origin (ThreeUI, adapted), what each prompt did, a table of my design decisions,
and a 3–5 sentence reflection draft marked for me to rewrite.
```

---

## Part 3: what to carry into any AI build

1. **Brief before build.** Copy, scope and concept in the first message, verbatim.
2. **Give exactly the source that's needed.** One file, not a collection.
3. **Specify behaviour, not feelings.** Swap "flowy" for direction, duration and easing; swap "smooth" for "distance-only swell, no points".
4. **Batch the details.** One prompt per layer (background, brand, content, story), with every value for that layer.
5. **Explore outside the build.** Ask for a written option or a throwaway branch, then commit to one direction.
6. **State delivery constraints early.** Single bundle; no root links; it must survive a reload.
7. **Set a verification budget.** A build plus one check; screenshots only when judging a visual.
8. **Correct in one line.** Name the element, the value and the reason; several fixes still go in one message.
