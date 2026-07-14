/**
 * PP Fragment @font-face — shared by every landing-styled page (home, blog).
 *
 * PP Fragment is a commercial Pangram Pangram font: it activates automatically
 * when the licensed file exists at public/fonts/PPFragment-SerifRegular.woff2
 * (see public/fonts/README.txt). Until then the `fontSerif` stack falls back
 * to Instrument Serif, which next/font always provides.
 */
export function PpFragmentFontFace() {
  return (
    <style>{`
      @font-face {
        font-family: "PP Fragment";
        src: local("PP Fragment Serif Regular"), local("PPFragment-SerifRegular"),
          url("/fonts/PPFragment-SerifRegular.woff2") format("woff2");
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
    `}</style>
  );
}
