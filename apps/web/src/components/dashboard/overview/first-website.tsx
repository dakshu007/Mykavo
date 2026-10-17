import Link from "next/link";
import { Plus } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";

/**
 * Zero websites and no setup guide (it was dismissed earlier): a page of
 * zeros says nothing, so lead with the one action that matters.
 */
export function FirstWebsite() {
  return (
    <section
      aria-labelledby="first-website-heading"
      className="rounded-card bg-card px-6 py-12 text-center shadow-card sm:px-8 sm:py-14"
    >
      <span className="mb-5 inline-flex size-14 items-center justify-center rounded-2xl bg-primary-soft">
        <LogoMark size={30} aria-hidden />
      </span>
      <h2 id="first-website-heading" className="text-2xl font-semibold tracking-tight text-ink">
        Monitor your first website
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-secondary">
        MyKavo discovers your pages, captures an approved baseline, then alerts you when something
        important changes or breaks.
      </p>
      <Link
        href="/dashboard/websites/new"
        className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Plus className="size-4" aria-hidden /> Add website
      </Link>
    </section>
  );
}
