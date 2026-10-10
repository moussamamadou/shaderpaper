# Phase 3: design references

Mobbin was available, so both references below come from it. Méridien's Figma is the third reference. Nothing is copied verbatim; each note says what ShaderPaper takes and what it changes.

## 1. ZARA (web): the gallery

- Flow "Adding items to a bag": https://mobbin.com/flows/9f4be359-506f-4a80-b283-6fcd3c44642b
- Listing with filters: https://mobbin.com/screens/136e0aee-422a-4fa9-a1c9-7fadb5ce5541
- Bag: https://mobbin.com/flows/488665a5-8b6e-44f4-89b8-8e33caf6327c

**What to learn**

- The image is the interface. Chrome is thin, type is small and quiet, and the grid gives the product almost the whole width.
- A grid-density switch ("View 2 / 3") lets browsers scan or study.
- Adding to the bag opens a side panel ("Added to your basket", then "See shopping basket") instead of leaving the page.
- The bag is laid out like a grid of products, with a fixed total and Continue at the bottom.

**How ShaderPaper adapts it**

- The poster grid gets the same priority: 4:5 art, a name, a category in mono caps and "From €39". The shop grid has a two-step density toggle.
- Add to cart opens the cart drawer with the configured poster's summary (size, frame, palette).

**What ShaderPaper does not take**

- The hidden hamburger nav on desktop. The categories are visible instead.
- The tiny, low-contrast caps. Labels stay at 12 px or more, and text contrast is at least 4.5:1.

## 2. Apple Store (web): configure, then buy

- Flow "Purchasing an item" (17 screens: product, bag, checkout, confirmation): https://mobbin.com/flows/b0b14742-ced9-42b7-864e-265e3a5c8c90

**What to learn**

- The product page keeps a sticky summary card with the configuration, delivery line, price and Add to Bag.
- The bag opens with one sentence of truth ("Your bag total is …").
- Checkout asks one plain question per section ("Where should we send your order?", "What's your contact information?").
- Review comes before paying, and the confirmation is calm ("You're all set") with the order number.

**How ShaderPaper adapts it**

- The PDP is a configurator. The live shader preview sits on the left. On the right is a sticky panel with the four shape knobs, palette and strength, then size and frame, then price and Add to cart.
- Checkout runs as four steps (Details, Delivery, Payment, Review) with question headings.
- The confirmation states plainly whether money was taken. In test mode it says no payment was taken.

## 3. Méridien (Figma `gMvo7pPlFJev1yPdDGbWL3`, pages 29 and 31)

**What to learn**

- The product page pairs a gallery with a sticky buy block and a single strong "Personalise · from 39 €" action. Next to it sits a quick-facts grid (delivery, personalisation, reprint, paper) and a cross-sell card.
- Captions sit on images as mono pills.

**How ShaderPaper adapts it**

- The same skeleton, but the gallery is the live shader, so there are no room photos yet. ShaderPaper has no product photography; photographed mockups are business input.
- Quick facts only state what is true: made to order, four shape controls, printed by a print-on-demand lab. Delivery time and paper spec stay "to be confirmed".
- The type is sans (Geist) instead of serif, so the two brands stay distinct.
