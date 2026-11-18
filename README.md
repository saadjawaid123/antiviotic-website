# Antiviotic website

Marketing site for Antiviotic, served at https://antiviotic.com by the Cloudflare Worker `antiviotic-website` (static assets).

## How it deploys
Every push to `master` is built and deployed by Cloudflare automatically. `wrangler.toml` serves this folder as static files; `.assetsignore` keeps source files off the live site.

## Structure
- `index.html`, `css/style.css`, `js/main.js`: the page and its scroll animations (GSAP + ScrollTrigger + SplitText, Lenis smooth scroll)
- `js/chip.js`: compiled Three.js scenes (3D chip + particle shield). Do not edit by hand.
- `src/chip.js`, `src/particles.js`: source for `js/chip.js`
- `vendor/`: GSAP and Lenis, bundled locally

## Editing the 3D scenes
```
npm install
npm run build   # rebuilds js/chip.js from src/
```
Everything else can be edited directly. Open `index.html` in a browser to preview.
