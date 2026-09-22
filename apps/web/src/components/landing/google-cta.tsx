import Link from "next/link";
import { GoogleIcon } from "@/components/brand/integration-icons";

/**
 * "Continue with Google" - the primary signup CTA across the marketing site.
 *
 * It links to /signup?provider=google, and the signup page starts the Google
 * handoff on arrival. That matters: a button promising Google and delivering
 * a form with a Google button somewhere on it is the kind of small dishonesty
 * people notice, and the extra click is exactly the friction this replaces.
 *
 * A LINK, NOT A BUTTON. Marketing pages are static, and turning the main CTA
 * into a client component would pull the auth client into every one of them.
 * A plain anchor also stays crawlable and middle-clickable.
 *
 * `emailFallback` is not optional politeness. Not everyone has a Google
 * account, or wants to use it here, and a page whose only route in is one
 * identity provider quietly turns those people away.
 */
export function GoogleCta({
  label = "Continue with Google",
  size = "lg",
  className = "",
  emailFallback = true,
  next,
}: {
  label?: string;
  size?: "lg" | "md";
  className?: string;
  emailFallback?: boolean;
  /** Same-origin path to land on after auth. */
  next?: string;
}) {
  const query = new URLSearchParams({ provider: "google" });
  if (next) query.set("next", next);
  const href = `/signup?${query.toString()}`;
  const pad = size === "lg" ? "h-13 px-7 text-[15px]" : "h-11 px-6 text-[14px]";

  return (
    <div className={`flex flex-col items-center gap-2.5 ${className}`}>
      <Link
        href={href}
        className={`inline-flex ${pad} items-center justify-center gap-2.5 rounded-full border border-[#151515] bg-white font-semibold text-[#151515] shadow-[4px_4px_0_#151515] transition-all hover:-translate-y-0.5 hover:shadow-[5px_6px_0_#151515] active:translate-y-0 active:shadow-[2px_2px_0_#151515]`}
      >
        <GoogleIcon className="size-[18px]" />
        {label}
      </Link>
      {emailFallback && (
        <Link
          href="/signup"
          className="text-[12.5px] text-[#6B6B60] underline underline-offset-4 transition-colors hover:text-[#151515]"
        >
          or sign up with email
        </Link>
      )}
    </div>
  );
}
