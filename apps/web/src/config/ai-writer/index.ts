import { hubPage } from "./hub";
import { pagesA } from "./pages-a";
import { pagesB } from "./pages-b";
import { pagesC } from "./pages-c";
import type { WriterPage } from "./types";

/** All AI Writer landing pages, hub first. */
export const WRITER_PAGES: WriterPage[] = [hubPage, ...pagesA, ...pagesB, ...pagesC];

export function writerPage(path: string): WriterPage | undefined {
  return WRITER_PAGES.find((p) => p.path === path);
}

/** The config for a route; throws at build time if a route has no config. */
export function requireWriterPage(path: string): WriterPage {
  const page = writerPage(path);
  if (!page) throw new Error(`No AI Writer page config for ${path}`);
  return page;
}
