# Flow hero: reaching the final preview with the fewest tokens

## 1. Where tokens go, and the decision for each

In a Claude Code session, cost comes from five things. The plan answers each one.

| Cost driver | Why it's expensive | Decision |
|---|---|---|
| **Conversation length** | Every new message re-sends the whole conversation so far, so each extra turn costs more than the last. | **4 prompts in total.** Each one is a complete, self-contained chunk of work. No small talk, no "looks good, next". |
| **Discovery and iteration** | Unclear asks lead to options, questions and redoing work. Today this was most of the cost. | Every decision is fixed in advance: exact copy, fonts, colours, timings and behaviour. Claude builds each part once. |
| **Rebuilding what already exists** | Writing the shader background again from a description is the largest single piece of work. | **Bring it as files.** The background is the ThreeUI source I found plus my own adaptation of it from an earlier session. Upload both; don't rebuild them. |
| **Tool output** | Build logs, screenshots and whole-file reads all land in the conversation and are re-sent with every later message. | Quiet builds (last lines only), **no screenshots**, one headless check at the end, and read only the files being changed. |
| **Model** | The most capable model costs the most per token. | This is a specification-following build with no open design questions, so a mid-tier model such as Sonnet can carry it. Switch up only if a step fails twice. |

**Target:** 4 prompts and 1 end-to-end check, giving a published preview plus `PROCESS.md`. Corrections only if something is actually wrong, one line each.

---

## 2. Set up before the session (no tokens)

All of this is done on GitHub, before Claude is involved:

1. **Create the repo:** a new repo, for example `flow-hero`, with a README.
2. **Upload the background** into a `source/` folder:
   - `source/vanguard-dimensional.html`: the ThreeUI *Dimensional Field*, as sourced. (From the UIUX repo: `src/shaders/neuform-isolated/sources/vanguard-dimensional.html`.)
   - `source/LiquidDimensionalField.tsx`: my adaptation. (From the UIUX repo: `src/components/LiquidDimensionalField.tsx`.)
3. **Add `CLAUDE.md`** at the root with the text below. Claude reads it automatically, so the brief never has to be repeated in a prompt.

```markdown
# Flow hero

Landing-page hero for "Flow", a fictional productivity app. The page acts out
its tagline: it opens busy (noise) and settles as the visitor moves (Flow),
ending with the copy sharp and Get Started as the clear action.

## Fixed decisions
- Copy, exact: "Everything you need to get your work done, without the noise."
- CTAs: Get Started (primary, white), See how it works (glass). Nothing below them.
- Hero only. No dashboards, cards, icons or invented features.
- Fonts (Google): Mr Dafoe for the logo and "Flow"; Geist for everything else.
- Palette: #19d9bf → #6fb7ff → #7a3cff on #050608.
- Motion glides, never bounces. Respect prefers-reduced-motion.
- Background: sourced from ThreeUI (Dimensional Field), adapted by me earlier.
  Both files are in source/. Use them as given; don't modify them.

## How to work (token budget)
- Build exactly what the prompt specifies. Don't offer options or ask questions.
- Vite + React + TypeScript, `base: './'`, one JS + one CSS bundle.
- Run builds quietly (`npm run build 2>&1 | tail -3`). No screenshots.
- Read only the files you are changing. Don't re-read files you just wrote.
- Reply in at most 3 lines: what was built and the result. Commit each prompt.
```

---

## 3. The four prompts

Copy each quoted block as one message. Wait for the reply, then send the next.

### Prompt 1: stage, world and brand
**Purpose:** in one step, the living background (atmosphere) and a logo that acts out its name (identity).

> Set up the project per CLAUDE.md. Move the files in `source/` into `src/` and render `LiquidDimensionalField` full-bleed behind a hero section, with its wrapper at `pointer-events: auto`.
>
> **Header:** the logo on the left; a centre pill nav (Features, Pricing, Download); Sign in and a white Get Started on the right; a mobile menu sheet.
>
> **Logo:** "Flow" in Mr Dafoe, white at rest.
> - On hover, a drop glides F→w, 1.5 s per pass, looping while hovered. It's a drop and a lagging droplet fused by a goo filter (blur 1.6, alpha matrix `0 0 0 20 -8`), riding at letter heights 0.2, 0.12, 0.46, 0.46.
> - Each letter fills as the drop reaches it and stays filled while hovered: F `#28d3ca`, l `#59c0ee`, o `#7297ff`, w `#7851ff`, with a faint glow under the drop. On leave it drains back to white.
> - Clicking the logo calls `location.reload()` (prevent the default; don't link to `/`).

### Prompt 2: the headline, message and action
**Purpose:** identity at full scale, plus clarity: one message and one primary action.

> Hero content, left-aligned:
> - "LET YOUR WORK" in tracked uppercase Geist.
> - "Flow" in Mr Dafoe at `clamp(7.5rem, 16.5vw, 19rem)`, as one SVG `<text><textPath>` on a baseline path so the joins never break, filled with the palette gradient. Fit the viewBox to the ink with canvas `measureText`.
> - **Pour:** a bright copy (white → `#63f2dc`) clipped to a slanted, wavy stream runs F→w in 2.4 s. It plays 1.3 s after load, then every 3.2–5.2 s, and loops on hover. During a pour the baseline rolls as a gentle sine wave. The logo's drop (same goo, `#5ff5df → #6fb7ff`) rides just behind the front of the stream.
> - The exact copy in Geist 300, max width 34ch. Then the two CTAs.
> - On hover and focus, Get Started gains a 1.5 px gradient ring 4 px outside it, plus a halo (blur 14 px, opacity 0.22).

### Prompt 3: noise → Flow, then prove it and publish
**Purpose:** the core idea. The visitor's movement turns noise into flow. Then check the "done" criteria in one pass.

> Add an `order` value from 0 to 1. Send it to the background as `postMessage({flowOrder})`; `LiquidDimensionalField` already listens for it and sends `flowPointer` and `flowHello`.
> - It rises over 2.4 s of pointer movement (from the page, or from `flowPointer` messages), sinks over 7 s when movement stops, and locks at 1. Ease it in and out.
> - Set `--order` and `data-state` (noise / settling / flow) on the hero.
> - **Copy:** an SVG filter (turbulence + displacement up to 16 + blur up to 1.4) scaled by (1 − order), removed entirely at 1. Copy opacity 0.42 → 1.
> - **At 1:** Get Started scales to 1.06 with a teal/violet glow; See how it works fades to 0.62.
> - Focus on a CTA, reduced motion, or touch (after 1.8 s) settles straight to 1.
>
> Then run **one** headless check on the built bundle: first load, two reloads and a logo click each draw the canvas with a clean console, and the copy filter is gone after pointer movement. Publish the built page as an artifact and give me the link.

### Prompt 4: the record
**Purpose:** the assignment's workflow and reflection deliverables.

> Write `docs/PROCESS.md` in under 100 lines:
> - the goal and the noise → Flow idea;
> - the background's origin (sourced from ThreeUI, adapted by me earlier);
> - what each of the 4 prompts did and why;
> - why the session was planned for low token use;
> - a short table of decisions I made;
> - a 3–5 sentence reflection draft marked for me to rewrite.

---

## 4. Corrections, if needed

One line per correction, naming the element, the change and the reason. Send several in one message if needed; that's still one turn.

> Halo on Get Started too strong: opacity 0.15. Drop on the o and w sits low: landing 0.40.

## 5. After the session (no tokens)

1. Open the preview link while signed in. Check that it plays, that moving the mouse settles the page, that hovering the logo and "Flow" works, and that clicking the logo reloads.
2. On the preview page, click **Share → Anyone with the link**.
3. Rewrite the reflection in `docs/PROCESS.md` in your own words.
4. Submit the preview link, the repo, `docs/PROCESS.md` and the session.
