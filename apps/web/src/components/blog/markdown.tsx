import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Shared markdown renderer for the public blog and the CMS live preview.
 * Raw HTML in the source stays escaped (react-markdown default) - scanned
 * or authored HTML is never injected into the page (spec §59).
 *
 * When `headingIds` is provided (by PostContent, keyed by 1-based source
 * line), h2/h3 elements get matching `id` attributes so table-of-contents
 * anchors work. Lookup is by remark's position info, which is idempotent
 * across re-renders - no shared mutable counters.
 */
export function BlogMarkdown({
  content,
  className,
  headingIds,
}: {
  content: string;
  className?: string;
  headingIds?: Record<number, string>;
}) {
  const components: Components | undefined = headingIds
    ? {
        h2: ({ node, children }) => {
          const id = idForLine(headingIds, node?.position?.start.line);
          return (
            <h2 id={id}>
              {children}
              <HeadingAnchor id={id} />
            </h2>
          );
        },
        h3: ({ node, children }) => {
          const id = idForLine(headingIds, node?.position?.start.line);
          return (
            <h3 id={id}>
              {children}
              <HeadingAnchor id={id} />
            </h3>
          );
        },
      }
    : undefined;

  return (
    <div className={cn("blog-prose", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** "#" link to a section, shown on hover or focus, for sharing that section. */
function HeadingAnchor({ id }: { id: string | undefined }) {
  if (!id) return null;
  return (
    <a href={`#${id}`} className="heading-anchor" aria-label="Link to this section">
      #
    </a>
  );
}

function idForLine(
  headingIds: Record<number, string>,
  line: number | undefined,
): string | undefined {
  return line === undefined ? undefined : headingIds[line];
}
