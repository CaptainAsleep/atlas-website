# atlas-website-2

Redesign of airsoftatlas.app: a single scrolling page (`index.html`, `site.css`, `site.js`, no build step, no dependencies).

- `players.html`, `owners.html`, `pricing.html`, `about.html` redirect to the matching section of `index.html`, so old links keep working.
- `feedback.html`, `reset-password.html`, `verify-email.html` (emails and the apps link to them) keep their original markup and Firebase scripts; they are reskinned by `system.css`, which loads after `styles.css` and each page's inline styles. `styles.css`, `nav.js`, `logo.jpg`, `assets/` are unchanged copies from `atlas-website`.
- `media/` holds 720p web encodes of the promo videos; `img/` holds the logo, favicons and patch cutouts.
- The per-state field counts live in the `FIELDS` object at the top of `site.js` (counted from `seed-data.mjs` on 2026-11-16). Update it when the directory changes.
- The pricing calculator in `site.js` repeats the fee formula (3.5% + $1.30, $5 cap for field owners). Update it if fees change.

Preview locally: `python3 -m http.server 8000` in this folder, then open http://localhost:8000
