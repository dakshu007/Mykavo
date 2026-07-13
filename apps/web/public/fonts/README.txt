PP Fragment is a commercial typeface by Pangram Pangram (pangrampangram.com)
and cannot be committed to this repository.

To activate it on the landing page, place the licensed webfont file here as:

  PPFragment-SerifRegular.woff2

The @font-face in apps/web/src/app/page.tsx picks it up automatically
(font-display: swap). Until the file exists, the page falls back to
Instrument Serif, which is loaded via next/font and always available.
