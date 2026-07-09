import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Link href="/" aria-label="Fluxen home" className="mb-8 inline-flex">
        <Logo markSize={30} className="gap-2.5" wordmarkClassName="text-xl" />
      </Link>
      <div className="w-full max-w-100 rounded-card bg-card p-8 shadow-card">{children}</div>
      <p className="mt-6 text-[13px] text-ink-faint">Know what changed. Fix what matters.</p>
    </div>
  );
}
