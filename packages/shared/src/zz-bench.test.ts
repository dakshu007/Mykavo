// TEMPORARY benchmark harness (deleted after measuring).
import { it } from "vitest";
import { appendFileSync } from "node:fs";
import { fingerprintPage } from "./page-fingerprint";

const INPUTS: Record<string, () => string> = {
  comment: () => "<!--".repeat(200000),
  svg: () => "<svg ".repeat(50000),
  svg100k: () => "<svg ".repeat(20000),
  slash: () => "/".repeat(200000),
  lt: () => "<".repeat(200000),
  h1: () => "<h1>".repeat(50000),
  title: () => "<title>".repeat(50000),
  body: () => "<body>".repeat(50000),
  link: () => "<link ".repeat(50000),
  big: () => ("<p>hello <a href='/x'>x</a> <!-- c --> <script>var a=1</script></p>\n").repeat(40000),
};
it("bench", () => {
  for (const i of (process.env.BENCH_INPUT ?? "").split(",")) {
    const h = INPUTS[i]();
    const t = performance.now();
    fingerprintPage(h, 200, "https://example.com/");
    appendFileSync(process.env.BENCH_OUT ?? "/dev/null", `BENCH ${i} fingerprint ${Math.round(performance.now() - t)}ms\n`);
  }
}, 3_600_000);
