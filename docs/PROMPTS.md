# Flow hero: prompt plan for a lean rebuild

The goal: rebuild the final Flow hero in one new Claude Code session with as few tokens and credits as possible, while keeping the same workflow (plan, build, verify, document).

Why it can be lean: the first session spent most of its tokens on discovery, trying options and redoing work. Every decision is now known, so each prompt states the decision outright: exact fonts, colours, timings and behaviour. Claude doesn't have to guess, explore or ask.

## How to use it

- Send the prompts in order, one per message. Wait for each to finish before sending the next.
- Each prompt is complete on its own. Don't add "make it nice" or "explore options"; that invites iteration.
- Only send a correction if something is actually wrong, and name the exact element and the exact fix.
- Before prompt 1, have the ThreeUI *Dimensional Field* source files (`vanguard-dimensional.html`, `NeuformIsolatedEffects.tsx`, `threeui.css`) ready to attach or paste. The background must use them unchanged.

---

## Prompt 0: ground rules (send first)

> I'm rebuilding a finished design, so please don't explore alternatives. Work rules for this whole session:
> - Build only what each prompt specifies. Don't ask questions unless something is impossible.
> - Verify with `npm run build` plus at most one headless browser check per prompt (page loads, console clean). No screenshots unless I ask.
> - Keep replies to a few lines: what changed and the result of the check.
> - Commit after each prompt with a clear message. Don't open a PR.

## Prompt 1: project and background

> Create a Vite + React 18 + TypeScript project for a single-page desktop hero for a fictional productivity app called **Flow**. Hero only, no sections below it.
>
> Background: use the attached ThreeUI "Dimensional Field" source (`vanguard-dimensional.html`) unchanged, rendered full-bleed in a sandboxed `srcdoc` iframe behind the hero, showing only its canvas. Store the source file untouched. Make every change to it as string transforms on anchors at load time, and fall back to the original if an anchor is missing. The iframe must receive pointer events (`pointer-events: auto` on its wrapper).
>
> Build with `base: './'` so it runs as a single JS and CSS bundle from any path.

## Prompt 2: liquid, refracting bubbles

> In the background transforms:
> 1. **Glass:** each sphere is clear. It re-samples the background field behind it, bent by the surface normal (bend 0.05 + 0.12·fresnel), with a thin-film rainbow rim (0.38·fresnel), a small specular highlight (pow 220) and almost no tint in the centre.
> 2. **Liquid surface:** a gentle vertex wobble (0.045 at time×0.8). A pull uniform swells the surface along the normal by distance from the pointer only (`u_pull·exp(−d²·0.06)·0.55`), never toward the pointer's direction, so the bubbles never form points.
> 3. **Cursor:** a bubble near the cursor eases away from it (spring, about 0.7 s), grows 7%, then floats back when the cursor rests. Use time-based easing and clamp dt to 0–0.25 s.
> 4. **Beams:** keep the light beams always present with a floor: `beam = 0.3 + 0.7·smoothstep(−0.45, 0.9, …)`.
> 5. **Free drift:** the large, bottom-left and small upper bubbles each also wander slowly in a bounded area, on unrelated sine frequencies (reach about 0.9/1.1/1.9 world units in x and 0.6/0.8/1.4 in y), on top of everything else.

## Prompt 3: header and logo

> Header: logo left; centre pill nav (Features, Pricing, Download); right: Sign in and a white Get Started button. Mobile: a menu button that opens a sheet.
>
> Logo: "Flow" in **Mr Dafoe** (Google Fonts), white at rest. On hover, a teal drop glides through the word F→w in 1.5 s per pass and loops while hovered. It's a drop plus a lagging droplet fused by a goo filter (blur 1.6, alpha matrix `0 0 0 20 −8`), riding at each letter's height (fractions 0.2, 0.12, 0.46, 0.46). Each letter fills with colour as the drop reaches it and stays filled while hovered: F `#28d3ca`, l `#59c0ee`, o `#7297ff`, w `#7851ff`. The letter under the drop glows and lifts slightly. On leave the colour drains back to white. It glides; it never bounces.
>
> Clicking the logo reloads the page (`preventDefault`, then `location.reload()`). Don't use `href="/"`, which breaks in the preview.

## Prompt 4: headline, copy and buttons

> Hero content, left-aligned:
> - "LET YOUR WORK" in Geist, uppercase, widely tracked.
> - Below it, a large "Flow" in Mr Dafoe at `clamp(7.5rem, 16.5vw, 19rem)`, drawn as **one SVG** so the script joins never break. Use `<text><textPath>` on a baseline path, filled with a gradient `#19d9bf → #6fb7ff → #7a3cff`. Fit the viewBox to the real ink using canvas `measureText`, not `getBBox`.
> - **Pour:** a second, bright liquid copy of the word (white → `#63f2dc`) is clipped to a slanted, wavy stream that runs F→w over 2.4 s. It plays 1.3 s after load, then every 3.2–5.2 s, and loops while hovered. During a pour the baseline rolls as a gentle sine wave, so the letters sway together.
> - The logo's drop (same goo, `#5ff5df → #6fb7ff`) rides just behind the front of the pour.
> - Body copy, exactly: "Everything you need to get your work done, without the noise." In Geist 300, max width 34ch.
> - Buttons: **Get Started** (white, primary) and **See how it works** (glass). No note under them.
> - Get Started on hover and focus: a 1.5 px ring of the same gradient, 4 px outside the button, plus a faint blurred halo (opacity 0.22). No inner stroke.

## Prompt 5: the noise → Flow sequence

> Add an `order` value from 0 to 1 that the page shares with the background over `postMessage`. The iframe says hello on load, and the page answers with the current value.
> - It rises over 2.4 s of pointer movement anywhere, including over the iframe, which forwards its pointer moves. It sinks over 7 s when movement stops, and locks once it reaches 1. Ease it in and out.
> - **At 0 (noise):** the field is busy, the bubbles bob on their own rhythms, and the body copy is bent and softened by an SVG filter (turbulence + displacement up to 16 + blur up to 1.4).
> - **As order rises:** the bubbles blend into one shared slow current; turbulence drops from 0.4 to 0.22; the scene's clock slows by up to 45%; refraction bend drops 35%; the copy filter fades and is removed at the end so the text is pixel-sharp.
> - **At 1 (Flow):** Get Started scales to 1.06 with a teal/violet glow, and See how it works fades to 0.62.
> - Keyboard focus on a button, reduced motion, or a touch screen (after 1.8 s) settles straight to 1.

## Prompt 6: verify and publish

> Run one headless check against the built bundle: first load, two reloads and a logo click must each show the canvas drawing with a clean console, and the body copy must be readable after pointer movement. Then publish the built page as an artifact, as a single JS and CSS bundle, and give me the link.

## Prompt 7: process document

> Write `docs/PROCESS.md` for the assignment:
> - The brief.
> - The tools used.
> - The workflow in short steps: background choice, bubbles, logo, headline, the noise → Flow story, the buttons.
> - A table of where I directed or corrected the AI.
> - A 3–5 sentence reflection draft marked for me to rewrite.
>
> Keep it under 120 lines.

---

## Token-saving habits

- **One topic per prompt.** Mixing topics leads to partial work and follow-ups.
- **Exact values beat adjectives.** "1.5 px ring, opacity 0.22" costs fewer tokens than three rounds of "more subtle".
- **No screenshots by default.** One headless load check is enough; ask for a screenshot only to judge something visual.
- **Correct precisely.** Example: "the drop on Flow should sit 10% higher", not "the drop looks off".
- **Don't ask Claude to re-explain the project.** These prompts already hold the context.
