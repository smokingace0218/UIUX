# Flow hero: an intentional prompt plan

This is how I'll direct Claude Code to build the final Flow hero in one lean session. Every prompt has a stated purpose, exact decisions and a check. Nothing is left for Claude to guess, so no tokens go on exploring, back-and-forth or rework.

---

## 1. Project goals (decided before any prompt)

**What I'm designing:** the first screen of a landing page for Flow, a fictional productivity app.

**The one idea:** the page should *act out* its tagline, "Everything you need to get your work done, without the noise." It opens busy and fragmented. As the visitor engages, it settles into calm, coordinated movement; the message comes clear and Get Started becomes the obvious next step. Noise → Flow.

**Design goals**
1. **Identity:** "Flow" should look like it flows. A joined brush script, with colour and a water drop that travel through the letters the way the word is written.
2. **Atmosphere:** a living, liquid world of glass bubbles over moving light that responds to the visitor without becoming a toy.
3. **Clarity:** the exact brief copy and a single primary action, Get Started, which becomes the strongest element once the page has settled.
4. **Restraint:** motion that glides rather than bounces, and no invented product features, dashboards or icons. Flow stays undefined.

**Constraints**
- Hero only, desktop-first, still usable on a phone.
- Exact brief copy and the Get Started CTA.
- The background is the ThreeUI *Dimensional Field* source, used unmodified and adapted only at load time.
- It must open and replay reliably as a published preview.
- Accessible: readable without a mouse; reduced motion and keyboard focus skip straight to the settled state.

**Done means:** the preview loads and reloads cleanly; the noise → Flow story reads without explanation; the copy is sharp at the end; `docs/PROCESS.md` records how I directed the AI.

**How I work with Claude (the token budget)**
- The goals live in `CLAUDE.md`, so I never re-explain the project.
- One purpose per prompt. Exact values instead of adjectives.
- Claude verifies with a build and one headless check. No screenshots unless I ask.
- Corrections name the element and the fix.

---

## 2. Before the session

1. Create `CLAUDE.md` at the repo root with the text below. Claude Code reads it automatically every session.
2. Add the background to the repo (upload; don't paste it into the chat):
   - `source/vanguard-dimensional.html`: the ThreeUI *Dimensional Field* source, unmodified.
   - `source/LiquidDimensionalField.tsx`: my adaptation of it from an earlier exploration session (liquid glass bubbles, cursor response, free drift, the noise → Flow hooks).

   That's all the background needs. The other ThreeUI files belong to the wider effect collection, and the page doesn't use them.

```markdown
# Flow hero

Landing-page hero for "Flow", a fictional productivity app. The page acts out
its tagline: it opens busy (noise) and settles as the visitor engages (Flow),
ending with the copy sharp and Get Started as the clear action.

## Fixed
- Copy, exact: "Everything you need to get your work done, without the noise."
- Primary CTA: Get Started. Secondary: See how it works.
- Hero only. No dashboards, feature cards, icons or invented features.
- Fonts: Mr Dafoe (logo, "Flow"), Geist (everything else).
- Palette: #19d9bf → #6fb7ff → #7a3cff on near-black #050608.
- Motion glides, never bounces. Respect prefers-reduced-motion.
- Background: sourced from ThreeUI (Dimensional Field) and adapted by me in an
  earlier session. Both are in source/: the original stays unmodified; my
  adaptation transforms it at load. Use them as given.

## How to work
- Build only what the prompt asks; don't explore alternatives or ask questions.
- Stack: Vite + React + TypeScript, `base: './'`, one JS and one CSS bundle.
- Verify with `npm run build` and one headless check (loads, console clean).
  No screenshots unless asked.
- Reply in a few lines: what changed and the check result. Commit each step.
```

---

## 3. The prompts

Send them one at a time and wait for each to finish.

### Prompt 1: the stage and the world
**Purpose:** a reliable base, plus the atmosphere goal: a living world of glass bubbles before anyone interacts. The background was sourced from ThreeUI and adapted by me earlier, so this step places it rather than reinventing it.

> Set up the project per CLAUDE.md. The background is in `source/`: the ThreeUI Dimensional Field original, which I sourced, and my adaptation, `LiquidDimensionalField.tsx`. Move both into `src/` and use them as given: render it full-bleed behind a hero section, with its wrapper at `pointer-events: auto`. Add an empty header and hero content area. Don't change the background code.

### Prompt 2: (only if not bringing the adaptation) the world becomes liquid glass
**Purpose:** the atmosphere goal. Skip this prompt if `LiquidDimensionalField.tsx` was provided in prompt 1; it already does all of this.

> In the background transforms:
> - **Glass:** each sphere is clear. It shows the background field bent through it (bend 0.05 + 0.12·fresnel), with a thin-film rainbow rim (0.38·fresnel), a small highlight (pow 220) and no tint in the centre.
> - **Liquid:** a gentle vertex wobble (0.045). Near a moving cursor, swell the surface by distance only (`u_pull·exp(−d²·0.06)·0.55`), so it never forms points. The bubble eases away from the cursor (about 0.7 s spring), grows 7%, and floats back when the cursor rests.
> - **Always alive:** keep a floor on the light beams (`0.3 + 0.7·smoothstep(−0.45, 0.9, …)`). The large, bottom-left and small bubbles also wander slowly in bounded areas (reach about 0.9/1.1/1.9 in x, 0.6/0.8/1.4 in y), on unrelated frequencies.
> - Use time-based easing and clamp dt to 0–0.25 s.

### Prompt 3: a logo that acts out its name
**Purpose:** the identity goal in miniature. The brand flows when touched and rests quietly otherwise.

> Header: the "Flow" logo on the left in Mr Dafoe, white at rest; a centre pill nav (Features, Pricing, Download); Sign in and a white Get Started on the right; a mobile menu sheet.
> - **On hover:** a drop glides through the logo F→w (1.5 s per pass, looping while hovered). It's a drop plus a lagging droplet fused by a goo filter, riding at each letter's height (0.2, 0.12, 0.46, 0.46 of the letter box).
> - **Colour:** each letter fills as the drop reaches it and stays filled while hovered: F `#28d3ca`, l `#59c0ee`, o `#7297ff`, w `#7851ff`. The letter under the drop glows faintly. On leave it drains back to white.
> - **Click:** reloads the page (`preventDefault`, then `location.reload()`). Don't use `href="/"`.

### Prompt 4: the headline that flows
**Purpose:** the identity goal at full scale. The headline should express "flow" in its writing direction and stay perfectly legible.

> Hero content, left-aligned:
> - "LET YOUR WORK" in tracked uppercase Geist.
> - Below it, "Flow" in Mr Dafoe at `clamp(7.5rem, 16.5vw, 19rem)`, as **one SVG** `<text><textPath>` so the joins never break. Fill it with the palette gradient. Fit the viewBox to the ink using canvas `measureText`.
> - **Pour:** a bright liquid copy (white → `#63f2dc`) is clipped to a slanted, wavy stream that runs F→w in 2.4 s. It plays 1.3 s after load, then every 3.2–5.2 s, and loops on hover. The baseline rolls as a gentle wave during a pour.
> - **Drop:** the logo's drop (same goo) rides just behind the front of the pour.

### Prompt 5: the message and the action
**Purpose:** the clarity goal. One message, one primary action, and a hover state that invites without shouting.

> Under the headline: the exact copy in Geist 300 (max width 34ch); then **Get Started** (white) and **See how it works** (glass). Nothing below the buttons. On hover and focus, Get Started gains a 1.5 px gradient ring 4 px outside it, plus a faint blurred halo (opacity 0.22). No inner stroke.

### Prompt 6: noise → Flow
**Purpose:** the core idea. The visitor's own movement turns noise into flow, so the page *shows* the tagline instead of just saying it.

> Add an `order` value from 0 to 1 that the page shares with the background over `postMessage`. The iframe says hello on load and forwards pointer moves.
> - It rises over 2.4 s of pointer movement, sinks over 7 s when movement stops, and locks at 1. Ease it in and out.
> - **At 0:** the field is busy, the bubbles bob independently, and the body copy is bent and softened by an SVG filter (displacement up to 16, blur up to 1.4).
> - **Rising:** the bubbles join one slow shared current; turbulence 0.4 → 0.22; the scene clock slows by up to 45%; refraction −35%; the copy filter fades and is removed at 1.
> - **At 1:** Get Started scales to 1.06 with a teal/violet glow, and the secondary button fades to 0.62.
> - Focus on a button, reduced motion, or touch (after 1.8 s) settles straight to 1.

### Prompt 7: prove it and publish
**Purpose:** the "done" criteria. Reliable, not just pretty.

> Run one headless check on the built bundle: first load, two reloads and a logo click each show the canvas drawing with a clean console, and the copy is unfiltered after pointer movement. Then publish the page as an artifact and give me the link.

### Prompt 8: tell the story
**Purpose:** the assignment's AI workflow and reflection deliverables.

> Write `docs/PROCESS.md` (under 120 lines):
> - the goals from CLAUDE.md;
> - the steps above, one short paragraph each, with the intent of each;
> - a table of where I directed or corrected the AI, including the decisions I carried over from my first exploratory session;
> - a 3–5 sentence reflection draft marked for me to rewrite.

---

## 4. If something needs correcting

Use one line, naming the element, the change and the reason. For example:

> The drop on "Flow" sits too low on the o and w: raise those landing heights to 0.4, so it rides the bowls rather than the baseline.

This keeps each correction to one cheap, deliberate turn.
