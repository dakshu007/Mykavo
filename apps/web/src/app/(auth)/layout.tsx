import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Link href="/" className="mb-8 inline-flex items-center gap-2.5">
        <LogoMark />
        <span className="text-xl font-semibold tracking-tight text-ink">Fluxen</span>
      </Link>
      <div className="w-full max-w-100 rounded-card bg-card p-8 shadow-card">{children}</div>
      <p className="mt-6 text-[13px] text-ink-faint">Know what changed. Fix what matters.</p>
    </div>
  );
}
