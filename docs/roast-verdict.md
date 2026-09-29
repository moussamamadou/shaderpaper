# ShaderPaper — council roast verdict

**Date:** 2026-07-22
**Method:** `/roast` — 5 independent adversarial council agents + judge synthesis.
**Scores:** Contrarian 2/10 · Expansionist 8/10 · Logician 3/10 · Researcher 4/10 · Buyer 3/10

## Brief the council judged

Premium posters of generative shader art, buyer customizes via bounded controls (palette,
density, format, seed) before a giclée print. Not emotion/occasion-based. €100–200. Founder
writes GLSL himself, has **no audience**, **no time pressure**. Nuxt + Medusa + Prodigi.
Second brand alongside the (not yet launched) map/star-sky business.

## VERDICT: RESHAPE — confidence high

Kill the €100–200 customizable poster store. Keep the engine and the B2B door.

The score spread is misleading. The Expansionist's own caveat was "5/10 if it ships as another
pretty poster store" — i.e. the bull rejects the stated configuration too. **The council was
effectively unanimous against the idea as proposed**; it disagreed only about whether the
adjacent opportunity justifies the effort.

## The core contradiction (all five agents, independently)

Fine-art pricing pays for **an artist's decision**. Every control handed to the buyer transfers
authorship from the priced party (the artist) to the unpriced party (the buyer) — while the
UI simultaneously proves ~10⁴ equally valid outputs exist at zero cost.

- Logician: "the customizer is a scarcity-disproof machine — the product's own interface is
  the disproof of its own price."
- Buyer: "I'd have to tell guests I made it on a website. That's a €49 story, not a €150 story."

Contrast the map/sky product, where scarcity is *exogenous and n=1 by construction* — there is
one birth date, one set of coordinates, and the buyer cannot generate a second legitimate
version of their own artifact. There, customization **manufactures** scarcity. Here it destroys it.

## Evidence (Researcher, SimilarWeb Jun 2026 + web)

| Site | Visits/mo | Note |
| --- | --- | --- |
| generativehut.com | **6,730**, declining | Leading generative-art print shop. Maker keywords. |
| tylerxhobbs.com | 8,108 | "flow fields", "circular packing algorithm" |
| theposterclub.com | 252,030 | 44.8% organic search |
| desenio.com | 458,085 | |

- **No purchase-intent search stream exists** for generative art prints. The compounding-SEO
  moat that works for the map/sky brand has no analogue here.
- **Price ceiling is name-gated.** The Poster Club (curated, 12-colour giclée, named artists)
  sells €43–90. Tyler Hobbs QQL prints are $750 but **gated to NFT owners**. Vera Molnár's
  record is $138,600. None of that price is paid for the code. Anonymous algorithmic art
  clears at **$89–169**.
- **Already tried.** ([Verified 2026-07-22 — see "Verification note" below.](#verification-note-gasp--canvaspop))
  [GASP Gallery](https://www.producthunt.com/products/gasp-gallery) (2019, Michaela Moore +
  two friends) built a parameter editor → giclée print, at **$40–165**, with artist signature
  and hash in the plate margin: **~43 prints sold, ~700 followers**, now dormant.
  [CanvasPop](https://www.canvaspop.com/products/generative-art-prints) ships template +
  regenerate + palette + size commercially today. The mechanic is **not novel**.
  (Whether it is *undefensible* is not established — see note.)
- **The comparable is decided.** Mapiful (~$1M/yr) ranks on "stars in sky art for wedding
  date" — the occasion query *is* the traffic. Grafomap, same product without that engine,
  did **$120k cumulative**, founders took personal loans, sold to a printer in 2020.
- **Production is fine, differentiation isn't.** Prodigi is Fine Art Trade Guild approved,
  Hahnemühle German Etching 310gsm from £3.00. But MagicPattern, gradients.design and
  theblanck already export royalty-free 5K–8K shader gradients **for free**.

## Unit economics (Logician)

```text
€150 retail incl. 20% FR VAT  →  €125 net
  − giclée COGS                  €25–45
  − shipping                     €8–15
  − payment fees                 ~€4
  = contribution                 €60–85     (€10–45 if framed)

Cold CAC, non-emotional self-purchase, no deadline:   €80–200
Repeat rate: ~1 per household. No LTV to amortise.
```

**CAC ≥ contribution across the entire plausible range.** Paid acquisition is arithmetically
closed, not merely difficult.

Also flagged: reduced art-VAT almost certainly does not apply — unlimited POD reproduction
fails the "original work" test. Verify, but assume 20%.

## The two-brand structure is inverted (Logician)

- **Shared across brands: the cheap input** — Nuxt, Medusa, Prodigi, render pipeline,
  customizer engine. Engineering time, which is not scarce.
- **Duplicated: the expensive input** — brand equity, audience, domain authority, email list,
  ad-account learning. **None of it transfers. Zero.**

The second-brand form duplicates 100% of the costly work to economise on work already sunk.

## The real upside (Expansionist, corroborated by Buyer)

**Contract / hospitality art.** NINE dot ARTS, Indiewalls, Kalisher; citizenM, Mama Shelter,
The Hoxton, 25hours, Morning/Wojo. They buy **200–800 unique, rights-cleared, on-brand pieces
per property** against a fit-out deadline. A parametric shader system is a machine-answer to
that brief. One property = **€40k–120k**, and it consumes a weekend of parameter tuning.
A map-poster brand structurally cannot bid on this.

Corroboration: the Buyer, role-playing four archetypes independently, scored office/studio
**highest** (4/10 vs collector 1/10) — "honestly your most promising door."

Surface expansion beyond paper: dibond/acrylic large-format (€600–1,200), wallpaper panels,
acoustic panels, rugs, and pure-digital (4K/8K packs, VJ loops) at 100% margin. Each new
surface costs an integration, not new art.

## The reshape

1. **Pick a side — recommended: the artist side.** No sliders. You choose everything. Editions
   of 50, signed, numbered, **seed hash printed in the plate margin**. Real provenance, native
   to the medium, and the only known mechanism for pricing infinitely reproducible output.
   ⚠ **Confidence medium, not high** — GASP Gallery shipped signature + margin hash in 2019 and
   sold ~43 prints. See [Verification note](#verification-note-gasp--canvaspop) before relying
   on this.
   (The alternative is honest too: keep sliders, drop the fine-art pose, sell at €59–89.
   €100–200 is the dead zone — too dear for decor, too unauthored for art.)
2. **Sequence brand 1 first.** Its build is shared; its audience is not.
3. **Build the person, not the store.** Publish shaders free and publicly until people follow
   the work. Nervous System runs 42.8% direct traffic off 19 years of audience. That's the moat.
4. **Add one page: "Contract & Interiors."** One day of work, plausibly the highest-EV object
   on the domain.
5. **Fix banding at the source.** Prodigi's API takes 8-bit JPG/PNG/PDF. Dither + film grain
   in the shader before export — three lines of GLSL, and genuinely an edge.

## The cheapest 48-hour test

Render your three best pieces. Print **one** at a local fine-art lab (~€45 — not Prodigi; you
want it in your hands this week). Photograph it on a **real wall in real afternoon light**, in
a normal room, not a mockup render. Post to r/generative, X, Are.na with one line:
*"prints coming — reply if you'd want one."*

Under €60. Tests both riskiest assumptions at once: does anyone pull, and do shaders survive
paper. The Buyer specified this unprompted — *"a photo on a real wall in real afternoon light,
and one honest sentence about how it prints. That's it."*

## Verification note: GASP & CanvasPop

The council's "already tried" claim was independently re-checked on 2026-07-22, because the
cited GASP URL was a `github.io` page — an odd host for something described as a gallery
business. Result: **substantively true, partly overstated.**

**Confirmed.** GASP Gallery was a real 2019 startup (Michaela Moore + two friends; it began as
a creative-coding challenge and became a web app). [Product Hunt launch](https://www.producthunt.com/products/gasp-gallery),
82 upvotes, #10 of the day; [covered by Beebom, Sept 2019](https://beebom.com/gasp-gallery-customise-art-prints/).
Controls were colour / weight / smoothness / turbulence. Giclée on 100% cotton, 7 sizes,
**$40 (8×8") – $165 (24×24")**, artist signature bottom right, **hash value bottom left margin**.
Reported ~700 followers and **43 prints sold**. Now dormant (no reviews; last activity ~7 years).

[CanvasPop](https://www.canvaspop.com/products/generative-art-prints) is live: template →
regenerate → colour palette → size. But it is *not* fully self-serve — a human design team
emails a proof for approval — and it is one line among many at a mainstream canvas printer,
not a generative-art brand.

**Overstated / corrected:**

- *"Neither novel nor defensible"* — **not novel** is proven. **Not defensible** was an
  inference presented as evidence. GASP's fade doesn't establish undefensibility; three PMs
  running a 2019 side project with no audience is a weak test.
- GASP was a **marketplace for generative artists**, not a single-artist brand. Different
  business from ShaderPaper.
- The **43** figure is self-reported in the founder's own retrospective, extracted via search
  (the page would not load directly), and carries **no time period**. Treat as undated and
  unaudited.

**⚠ This cuts against reshape recommendation #1.** GASP already shipped signature-plus-hash-in-
the-plate-margin — the exact provenance mechanic recommended above — and still sold ~43 prints
at a price band overlapping the target.

The distinction that partly rescues the recommendation: GASP kept the **sliders** *and* added
the signature, which is precisely the incoherent middle the Buyer warned against ("whose
signature is it if I chose the turbulence?"). The recommendation above drops the customizer
entirely. So the precedent does not cleanly refute it — but this is exactly the kind of
distinction one reaches for to protect a prior, and should be weighted accordingly.

**Net effect on the verdict:** RESHAPE still stands (nothing here rescues the €100–200
customizable store — if anything GASP is a data point *for* the contradiction). But confidence
in the *specific* signed-editions-plus-hash fix drops from high to **medium**. It is less
proven than the verdict originally implied.

## Post-roast revisions (2026-07-22, after founder input)

Two founder corrections materially changed the verdict. Both are recorded here rather than
edited into the body above, so the original council read stays auditable.

### Revision 1 — the target is €10k/month, not venture scale

Founder's actual goal: **~€10k/month from ~5 collections × 4 pieces = 20 works.** Most of the
council's pessimism was implicitly priced against a €1M-scale outcome. Re-run:

| Model | Orders/mo needed | Note |
| --- | --- | --- |
| €150, unlimited POD | **67** | ≈ 100% of generativehut.com's *entire* global traffic at 1% CVR. Not modest. |
| €300, editions of 50 | **33** | Contribution ≈ €200/order → €6,600/mo. Achievable. |

```text
€300 incl. 20% VAT   → €250 net
  − giclée + ship       ~€50
  = contribution        ~€200/order   × 33/mo = €6,600/mo
```

**The small catalogue forces the editions model.** 20 pieces × 50 editions = 1,000 finite
units = **30 months of runway** and ~€300k lifetime revenue. Twenty pieces printed *unlimited*
requires 67 sales/month forever; twenty pieces *editioned* requires 33/month and supplies the
scarcity that justifies €300. The founder's own constraint selects the reshape.

Consequences:

- **Name problem shrinks from impossible to ordinary** — need ~1,500–2,000 engaged subscribers
  at ~2% conversion per drop, not 200k. Standard "1,000 True Fans" shape.
- **CAC wall stops binding** — 33 orders/mo from an owned list routes around paid entirely.
- **LTV appears** — edition collectors buy the next drop. Kills the "~1 poster per household,
  no LTV" problem, which was the single worst number in the original analysis.
- **"No time pressure" becomes the strategy, not the anaesthetic.**

⚠ €10k/mo revenue ≈ **€6.5k contribution** before hosting, surcharges, returns, and time.

### Revision 2 — the aesthetic is flat/geometric, not gradients

The council (and the judge) reasoned about **mesh gradients and plasma**. The actual intent is
flat shaders, geometric systems, fractals, Truchet/Voronoi/SDF, line work. This invalidates
three findings:

- **Banding risk — mostly void.** Flat colour fields and hard edges are the *easy* case for
  giclée. The 8-bit pipeline concern was specific to smooth gradient ramps.
- **"Screen-native / emissive" argument — void.** Flat geometric work is built from shape and
  edge, not light. That is a paper tradition, not a display one.
- **Free-tools commoditization — void.** MagicPattern / gradients.design / theblanck export
  *mesh gradients*. Nobody gives away parametric Truchet or fractal systems.

**And it inverts the artifact question.** Flat geometric work rewards physical scale — LeWitt,
Op art, Molnár all die as thumbnails and live at 70×100. For this aesthetic the print is the
*better* version of the work, not a screenshot of it. That was the missing artifact story.

**It also flips the cited market evidence.** Hobbs' Fidenza (flow fields), Cherniak's Ringers
(flat line work), Molnár and Mohr (hard-edged geometric) — the high-clearing generative art
quoted above as evidence *against* the idea is mostly evidence *for* this exact aesthetic.

**New risk introduced:** flat geometric is the most saturated corner of generative art
(Art Blocks made flow fields and Truchet ubiquitous). Differentiation moves from medium to
**taste and system design** — a craft problem, not a structural one.

**Unchanged by either revision:** the audience/name problem (~18 months of public work), and
the authorship contradiction (sliders transfer the artist's decision to the buyer regardless
of aesthetic). Note GASP's controls were colour/weight/smoothness/turbulence — already the
flat/flow-field kind. Their ~43 prints are *not* explained away by Revision 2.

### Revised verdict

**RESHAPE → conditional GO.** The path now closes arithmetically, which it never did at €150
unlimited. Remaining risk is concentrated almost entirely in **audience**, not product or
production. Conditions: editions not unlimited, no customizer at fine-art price, brand 1 still
ships first, and the €60 print test still runs before any build.

## Dissent worth keeping

The Contrarian's sharpest point is not economic, it's behavioural:

> The honest reason you want to build ShaderPaper is that writing GLSL is more fun than writing
> eight `occasions/` landing pages and doing French keyword research. "No time pressure" is the
> anaesthetic that makes it feel safe. The failure mode isn't rejection — it's 10 sales in 12
> months, mostly peers, while brand 1 launches four months late and half-built.

Worth re-reading before any build work starts here.
