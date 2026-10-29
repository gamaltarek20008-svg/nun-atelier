# NŪN Atelier — Green Edition

A standalone storefront: the same editorial layout, scroll animations and
responsiveness as the reference shop, recoloured to deep green and ivory.
Plain HTML, CSS and JavaScript — **no framework, no backend, no admin panel**.

## Run it

```bash
node serve.mjs          # http://localhost:4173
```

or double-click `start.bat` (opens the browser automatically).

You can also open `index.html` directly, though a local server is recommended.

## Pages

| File            | What it is                                                        |
| --------------- | ----------------------------------------------------------------- |
| `index.html`    | Home: hero, categories, new-in rail, promos, story, stats, quotes |
| `shop.html`     | Catalogue with filters, sorting and pagination                    |
| `men.html`      | Department page — Men                                             |
| `women.html`    | Department page — Women                                           |
| `kids.html`     | Department page — Kids                                            |
| `accessories.html` | Department page — Accessories                                  |
| `product.html`  | Product page — `?slug=atelier-poplin-shirt`                       |
| `cart.html`     | Bag, coupons and order summary                                    |

## Departments

The catalogue is split into four departments — Men, Women, Kids and
Accessories — each with its own static page. Department pages reuse the shop
renderer with the category locked, so the Category filter is hidden and
`?category=` is ignored.

## What is included

- Sticky header that hides on scroll, announcement marquee, scroll reveals,
  parallax editorial image, animated stat counters, rotating testimonials,
  hover image swap on product cards and scroll-snap product rail.
- Live filtering by size, colour and price band (plus category on the main
  shop page), five sort orders, URL-synced state and pagination.
- Product gallery with thumbnails and a full-screen lightbox, colour and size
  selection, per-size stock, quantity, accordions and a mobile sticky buy bar.
- Slide-out bag, full-screen search, toasts, wishlist toggle.
- Cart persisted in `localStorage`, coupons `NUN10` (10%) and `WELCOME5` (5%),
  free shipping over $250.
- Responsive at every breakpoint, reduced-motion support, RTL-safe CSS.
- **Dark mode** — header toggle plus a mobile-panel switch. The choice is stored
  in `localStorage["nun.theme"]`; on a first visit it follows the OS
  `prefers-color-scheme`.
- **Arabic mode** — the header `AR` button (or `?lang=ar`) switches the whole UI
  to Arabic and `dir="rtl"`, including product names, descriptions, materials,
  care notes and categories. English stays the base language; the choice is
  stored in `localStorage["nun.lang"]` and the switch back to English is `EN`.

## Localisation

- UI strings and Arabic product copy live in `assets/js/i18n-ar.js`
  (`window.NUN_AR`). Arabic product fields (`nameAr`, `shortAr`,
  `descriptionAr`, `materialAr`, `careAr`, …) live beside the English ones in
  `assets/js/data.js`.
- The translator runs as a post-render DOM pass plus a `MutationObserver`, so
  every dynamic view (filters, searches, toasts, drawer) is translated too.
  English markup stays the canonical source; nothing has to be duplicated.

## Notes

- Everything is static: images live in `assets/img`, the catalogue in
  `assets/js/data.js` (`window.SHOP_DATA`).
- Checkout is intentionally disabled — this is a front-end demo, and there is
  no account, dashboard or admin route of any kind.
- The catalogue and photography are the NŪN sample data (Pexels imagery);
  the layout style is inspired by the Aniq demo. No third-party code is copied.
