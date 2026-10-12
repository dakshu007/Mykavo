import { SUPPORT_ARTICLES } from "@/config/support-kb";
import { createSupportEngine } from "./engine";

/** The assistant over the full knowledge base, built once per server instance. */
export const supportEngine = createSupportEngine(SUPPORT_ARTICLES);
