import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Shared markdown renderer for the public blog and the CMS live preview.
 * Raw HTML in the source stays escaped (react-markdown default) — scanned
 * or authored HTML is never injected into the page (spec §59).
 */
export function BlogMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn("blog-prose", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
