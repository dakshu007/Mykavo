import { WriterLanding, writerMetadata } from "@/components/ai-writer/writer-landing";
import { requireWriterPage } from "@/config/ai-writer";

// AI Writer landing page: content in config/ai-writer, layout in components/ai-writer.
const page = requireWriterPage("/ai-article-writer");

export const metadata = writerMetadata(page);

export default function Page() {
  return <WriterLanding page={page} />;
}
