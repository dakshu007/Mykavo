import type { Metadata } from "next";
import Link from "next/link";
import { fontDisplay, fontSans } from "@/components/landing/style";
import { isUnsubscribableNotification } from "@/lib/email-opt-out";

export const metadata: Metadata = {
  title: "Unsubscribe - MyKavo",
  robots: { index: false, follow: false },
};

/**
 * Confirm page for the unsubscribe link in lifecycle emails. Opening the
 * link changes nothing - link scanners open every link in an email - only
 * pressing the button (a POST) does. Mail clients that support one-click
 * unsubscribe skip this page entirely.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string; done?: string; error?: string }>;
}) {
  const { n, done, error } = await searchParams;
  const valid = done ? true : await isUnsubscribableNotification(n);

  let title: string;
  let body: React.ReactNode;
  if (done) {
    title = "You are unsubscribed";
    body = (
      <p>
        You will not get MyKavo&apos;s onboarding and offer emails again. Alerts about your websites are separate and
        keep working - you can change them any time in{" "}
        <Link href="/dashboard/notifications" className="font-medium underline decoration-[#FFD400] decoration-2 underline-offset-4">
          Notifications
        </Link>
        .
      </p>
    );
  } else if (!valid || error) {
    title = "This link did not work";
    body = (
      <p>
        It may be incomplete or out of date. Reply to any MyKavo email and we will take you off the list by hand.
      </p>
    );
  } else {
    title = "Unsubscribe from MyKavo tips?";
    body = (
      <>
        <p>
          This stops the onboarding and offer emails. Alerts about your websites are not affected and keep coming.
        </p>
        <form action={`/api/email/unsubscribe?n=${encodeURIComponent(n ?? "")}`} method="post" className="mt-7">
          <button
            type="submit"
            className="rounded-full bg-[#151515] px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD400]"
          >
            Unsubscribe
          </button>
        </form>
      </>
    );
  }

  return (
    <main className={`${fontSans} flex min-h-svh items-center justify-center bg-[#FBFAF3] px-5 text-[#151515] antialiased`}>
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 text-center">
        <Link href="/" className={`${fontDisplay} text-[18px]`}>
          MyKavo
        </Link>
        <h1 className="mt-6 text-[24px] font-semibold tracking-tight">{title}</h1>
        <div className="mt-3 text-[15px] leading-7 text-[#6B6B60]">{body}</div>
      </div>
    </main>
  );
}
