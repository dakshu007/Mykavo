import { llmsFullText } from "@/lib/seo/llms-full";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(llmsFullText(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
