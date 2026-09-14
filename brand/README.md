# Brand assets

`mylapore-bites-logo-master.png` — the master artwork supplied by the owner.
1254×1254, transparent background.

Everything in `apps/storefront/public/` is generated from this file:

| Generated | What it is |
|---|---|
| `logo-full.png` | the complete lockup, used in the hero |
| `logo-lockup.png` | wordmark + tagline, used in the footer |
| `icons/icon-192.png`, `icons/icon-512.png` | PWA icons — the temple-and-leaf emblem on white |
| `icons/apple-touch-icon.png` | iOS home screen |
| `favicon.ico` | multi-size favicon |

The palette in `apps/storefront/src/app/globals.css` is sampled from this file,
not chosen by eye:

- `#153017` forest green — the "Mylapore" wordmark
- `#AF451F` terracotta — the "BITES" lettering
- `#B5751F` brass — the gopuram, the arc, the rules beside BITES

If the logo is ever revised, regenerate the assets and re-sample those three
values rather than hand-editing the CSS.
