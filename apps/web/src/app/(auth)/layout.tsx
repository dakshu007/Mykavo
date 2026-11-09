import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthShowcase } from "@/components/auth/auth-showcase";

/**
 * Sign in, sign up and the connect/authorize screens: the form on the left,
 * on the page's own light or dark surface with a theme switch in the corner,
 * and on wide screens a dark showcase panel on the right (example data,
 * labelled). Phones get the form alone.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex min-h-screen flex-col px-5 py-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="MyKavo home" className="inline-flex">
            <Logo markSize={28} className="gap-2.5" wordmarkClassName="text-lg" />
          </Link>
          <ThemeToggle />
        </header>

        <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          {children}
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">
          <span>Know what changed. Fix what matters.</span>
          <span className="flex gap-4">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
          </span>
        </footer>
      </div>

      <aside className="sticky top-0 hidden h-screen p-3 lg:block">
        <AuthShowcase />
      </aside>
    </div>
  );
}
