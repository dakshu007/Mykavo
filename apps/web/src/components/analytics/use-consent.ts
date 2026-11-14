"use client";

import { useEffect, useState } from "react";
import { CONSENT_EVENT, readConsent, type ConsentChoice } from "@/lib/consent";

/**
 * The visitor's cookie choice: undefined until read on the client, null when
 * they have not chosen yet, then "all" or "essential". Follows changes.
 */
export function useConsent(): ConsentChoice | null | undefined {
  const [choice, setChoice] = useState<ConsentChoice | null | undefined>(undefined);
  useEffect(() => {
    // Read after mount: the server render has no cookie to read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(readConsent());
    const onChange = (e: Event) => setChoice((e as CustomEvent<ConsentChoice>).detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);
  return choice;
}
