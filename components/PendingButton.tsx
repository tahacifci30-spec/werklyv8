"use client";

import { useFormStatus } from "react-dom";

/**
 * Verzendknop met een eigen vormgeving (een rij, een icoon) die toch direct laat zien dat de tik is aangekomen:
 * tijdens het wachten wordt hij lichter en is hij niet nog een keer in te drukken.
 */
export function PendingButton({ className = "", children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} type="submit" disabled={pending} aria-busy={pending} className={`${className} ${pending ? "animate-pulse opacity-60" : ""}`}>
      {children}
    </button>
  );
}
