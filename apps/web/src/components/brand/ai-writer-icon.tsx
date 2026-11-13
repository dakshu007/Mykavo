/**
 * The AI Keywords & Blog Writer mark: a pencil writing a line, with two AI
 * sparkles. Drawn on the same 24px grid, 2px round stroke and currentColor as
 * the lucide icons beside it in the sidebar and header, so it sits in those
 * lists as one of them, and takes `className` sizing the same way.
 */
export function AiWriterIcon({ className, ...rest }: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      focusable="false"
      {...rest}
    >
      <path d="M9 20.5H4.5V16L15.3 5.2a2.3 2.3 0 0 1 3.3 0l1.2 1.2a2.3 2.3 0 0 1 0 3.3Z" />
      <path d="m13.5 7 3.5 3.5" />
      <path d="M13 20.5h7.5" />
      <path d="M6.5 1.75 7.6 4.9l3.15 1.1L7.6 7.1 6.5 10.25 5.4 7.1 2.25 6 5.4 4.9Z" fill="currentColor" stroke="none" />
      <path d="m20.25 12.75.55 1.45 1.45.55-1.45.55-.55 1.45-.55-1.45-1.45-.55 1.45-.55Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
