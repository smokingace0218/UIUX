# Flow hero: AI workflow

UI/UX design intern assignment: a desktop landing page hero for **Flow**, a fictional productivity app.

- **Tagline (from the brief):** "Everything you need to get your work done, without the noise."
- **Primary CTA (from the brief):** Get Started
- **Tools:** Claude Code (a cloud session working directly in this repository), the ThreeUI *Dimensional Field* WebGL background, and Playwright screenshots so each iteration could be checked visually.

## Final result

| | |
|---|---|
| Final desktop hero | ![Final desktop](process/07-final-desktop.png) |
| Same build on a phone | ![Final phone](process/08-final-phone.png) |

- Run locally: `npm install`, then `npm run dev`.
- Main code: `src/components/FlowHero.tsx`, `src/components/FlowHero.css` and `src/components/SiteHeader.tsx`.

## How the work went, step by step

### 1. Choosing the background and getting its real source

I chose ThreeUI's **Dimensional Field**: glass spheres over slow cyan and violet light beams. I wanted the original effect, not a lookalike, so I gave Claude the source and told it not to approximate it.

- Claude first refused to rebuild the effect from a description and asked for the source.
- When the source link was blocked by the session's network settings, it stopped and reported that, rather than guessing.
- After I pasted the source, it checked each file against the SHA-256 hashes ThreeUI publishes:
  - The stylesheet matched exactly.
  - Two files didn't match, because whitespace was lost in the paste. Claude recorded this openly and added `npm run verify:sources` so any later change to these files is caught.

![Background asset](process/01-background-asset.png)

### 2. First hero: a plan before code

Before writing code, Claude proposed a design plan:

- **Colours:** taken from the shader itself (its cyan `#19D9BF` and violet `#7A3CFF`), so the text and the background read as one piece.
- **Type:** *Anybody*, a variable display face whose width can stretch, with *Geist* for body text.
- **Signature:** the word "flow" in the headline swells under the cursor, like the glass in the background.

Claude reviewed its own screenshots and fixed two bugs:

- The nav button text was invisible.
- The mobile menu opened underneath the headline.

![First hero](process/02-first-hero.png)
![Flow word hover](process/03-flow-word-hover.png)

### 3. Exploring past the brief, then cutting back

I asked for a fully responsive page, and Claude read that as a full landing page: how it works, integrations, pricing, FAQ and a footer. The brief only asks for a hero, so I cut it back to the hero alone and put the effort into making that one screen work at every size: seven widths, from 2560px desktops down to sideways phones.

![Full page exploration, cut](process/04-full-page-exploration-cut.png)

### 4. Catching a bug the AI's own test missed

Watching the live preview, I noticed the bubbles didn't react to the mouse.

- **Cause:** pointer events had been turned off on the whole hero (so text wouldn't block clicks), and the background inherited that setting, so it never saw the cursor.
- **Why the earlier test missed it:** it compared screenshots, and the background animates on its own, so the frames changed anyway.
- **Fix:** Claude wrote a stricter test (does the background actually receive the pointer?), watched it fail, fixed the bug, and watched it pass. The camera now follows the cursor, and the bubbles shift in depth.

| Cursor far left | Cursor far right |
|---|---|
| ![Cursor left](process/05-bubbles-cursor-left.png) | ![Cursor right](process/06-bubbles-cursor-right.png) |

### 5. Checking the build against the brief

When I gave Claude the full brief, it compared the build against each requirement and found three gaps:

- It had made Flow an automation tool, but the brief says a productivity app. All copy was rewritten.
- The tagline wasn't on the page. It's now used word for word.
- The main button said "Start free". It's now **Get Started** everywhere (hero, nav and mobile menu).

Design call: "without the noise" argues for fewer elements, so we removed the "Works with Slack, Gmail…" line and cut the nav from four links to three. The tagline became the only supporting line, set larger.

### 6. Borrowing an idea from Butter: a logo that acts out its name

I studied [Butter](https://www.butter.video/): its interface type is plain and quiet, and the wordmark is the one expressive element. On hover the Butter logo melts, so the logo itself shows what the brand is about. I asked for the same idea applied to Flow.

The result: hovering the logo sends a current through it.

- The wave inside the mark starts to move, and a swell travels through F-l-o-w, widening, lifting and tinting each letter as it passes.
- When the pointer leaves, the current runs down smoothly instead of stopping dead.
- It also plays on keyboard focus, and it's off for reduced motion.

Two bugs were caught by testing before this shipped:

- **Colour drift:** the wave carried its gradient with it as it moved, so the mark turned all violet. The fix was to make the wave a mask over a fixed gradient: the line moves and its colours stay put.
- **Slow settle:** the run-down was counted in frames rather than seconds, so on a slow machine (the test machine drew only 5 frames per second) it took much longer than intended. The easing is now timed in seconds.

![Logo on hover, frame by frame](process/09-logo-current-on-hover.png)

## Where I directed or corrected the AI

| AI output | My direction |
|---|---|
| Ready to approximate a missing effect | Required the exact ThreeUI source, checked against its published hashes |
| Expanded "responsive webpage" into a six-section landing page | Cut it to the hero only, matching the brief |
| Its test said the hover worked | Noticed it didn't in the live preview; the root cause was a CSS inheritance bug |
| Invented an automation product and its copy | Brought the copy back to the brief's productivity app, tagline and CTA |
| A static logo | Pointed to Butter's melting wordmark as the reference for a logo that shows the brand's idea |

## Reflection

> **Draft for me to rewrite in my own words before submitting.**
>
> AI did most of the build work: porting the ThreeUI background into a React app, proposing the colour and type system, writing the code, and screenshot-testing it at every screen size. My part was direction and judgement: choosing the Dimensional Field background, holding the AI to the exact source rather than an approximation, cutting a full landing page back to the hero the brief asked for, and catching that the background ignored the mouse even though the AI's own test said it worked. I also pulled the copy back to the brief after the AI invented a different product. With more time I would test whether the moving background competes with "without the noise" (for example a calmer, slower version), design the section that "See how it works" leads to, and run a quick five-second test with a few people to check that the headline and tagline land.
