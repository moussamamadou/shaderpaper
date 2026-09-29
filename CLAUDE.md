# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What this is

**ShaderPaper** — an e-commerce brand selling posters of generative shader art, where the
buyer customizes the piece before ordering a physical print.

Right now this is an **analysis workspace**, not an application: no app code, no build system,
no test suite. Written analysis goes in `docs/`.

## Status

Early. **Decided:** ShaderPaper is a separate project — the map + star-sky brand in
`/Users/moussa/Developpement/poster-business` continues independently and is not being
replaced. Still open: positioning, stack, pricing, supplier. See `docs/concept.md`.

## Relationship to poster-business

`/Users/moussa/Developpement/poster-business` is a sibling workspace for a *different* brand:
premium personalized map + star-sky posters (FR-first, emotion/gift-driven, occasion SEO).
ShaderPaper shares the physical-print supply chain and possibly the stack, but the demand
model is not the same — do not assume analysis carries over between the two.

## Conventions

- New analysis output belongs in `docs/`.
- Keep speculation labelled as speculation. This workspace's value is an honest read of the
  idea, not a pitch deck for it.
