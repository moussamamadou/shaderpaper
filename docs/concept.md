# ShaderPaper — concept & first strategic read

**Date:** 2026-07-22
**Status:** superseded in part by `roast-verdict.md` (council verdict: **RESHAPE**, high
confidence). Read that first — it contains market data, unit economics, and a 48-hour test.
This file remains the record of the original idea and the first-pass read.

## The idea (as stated)

An e-commerce shop selling posters of **shader art**. The customer picks a type of shader
art and customizes it, then buys the print. Explicitly *not* emotion-based — unlike the
personalized map / star-sky product, there is no occasion or memory attached to the piece.

## The core problem

Dropping the emotional trigger is not a detail — it changes the business model.

The map/sky product works because it is a **gift**. Occasion search intent
("cadeau anniversaire de rencontre") is high-intent and price-insensitive: a €12 print sells
for €70+ because it encodes a memory. The customizer converts because the buyer sees *their*
street, *their* date, and falls in love mid-flow.

ShaderPaper has none of that:

- **No occasion, no search intent.** It's a self-purchase decorative item, competing with
  Desenio, Juniqe, Etsy and IKEA on aesthetics and price. That market has no pricing power.
- **Unique ≠ meaningful.** A slider-generated gradient is unique but carries no meaning.
  Uniqueness alone does not justify a premium price.
- **The customizer flips from asset to liability.** Sliders over a shader are a *design tool*,
  and customers aren't designers. Most will produce something ugly, feel it, and bounce.
  On the map product the customizer is the conversion moment; here it's a drop-off risk.
- **Print risk.** Shader art is mostly smooth gradients, and gradients band badly on anything
  short of true giclée on fine-art paper. Margin is thinner than the map product's.

## What is genuinely good about it

- Zero data and licensing cost — no map tiles, no star catalogue.
- Content production is effectively free; infinite SKUs.
- Visually spectacular → strong organic potential on TikTok / IG / Pinterest.
- A real paying audience exists: generative-art collectors buy Tyler Hobbs, Casey Reas,
  fxhash prints at serious prices. Narrow and taste-driven, but real.

## Proposed reshape (recommendation, not a decision)

Stop selling *"customize a shader."* Sell **curated generative editions**.

- Design 20–40 shader systems that are beautiful by construction.
- Give the buyer a **seed** plus 3–4 bounded controls (palette, density, format) so every
  reachable output is guaranteed to look good.
- Result: a product, not a tool. The taste burden stays with the brand, not the customer.

Optional bridge back to gifting: derive the seed from something personal — a date, a name,
coordinates, a song — so the output is deterministic, unique, and *theirs*. This partially
restores the gift trigger without turning the product into a design app.

## Decided

- **ShaderPaper is a separate project.** The map + star-sky brand continues independently;
  this does not replace it. Two distinct brands, two storefronts.
- Consequence: the scarce resource is now build time and attention, not strategy. Sequencing
  matters — which brand ships first, and whether ShaderPaper waits until the map/sky store
  is live and selling. That question is open (see below).

## Open questions

1. **Sequencing.** Which brand gets built first, and does ShaderPaper start before the
   map/sky store has revenue? Both are premium storefronts with real build cost.
2. Who exactly is the buyer — generative-art collectors, tech/design offices, or general
   decor shoppers? Each implies a different price point and channel.
3. What price does a bounded-customization generative print actually clear at?
4. Which print supplier can hold smooth gradients without banding, and at what unit cost?

## Next step

Run `/roast` (in the sibling `poster-business` workspace) against this concept before any
build work.
