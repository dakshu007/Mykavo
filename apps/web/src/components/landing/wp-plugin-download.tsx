"use client";

import { Download } from "lucide-react";
import { track } from "@/lib/analytics";
import { WP_PLUGIN_DOWNLOAD_PATH, WP_PLUGIN_VERSION } from "@/config/wordpress-plugin";

/** The plugin zip download, counted so we know the page converts. */
export function WpPluginDownload({
  placement,
  variant = "gold",
}: {
  placement: string;
  variant?: "gold" | "ink";
}) {
  const styles =
    variant === "gold"
      ? "border-[#151515] bg-[#FFD400] text-[#151515] shadow-[4px_4px_0_#151515] hover:bg-[#ffe14d]"
      : "border-[#151515] bg-[#151515] text-[#F5F5F0] hover:bg-[#2a2a2a]";
  return (
    <a
      href={WP_PLUGIN_DOWNLOAD_PATH}
      download={`mykavo-${WP_PLUGIN_VERSION}.zip`}
      onClick={() => track("wp_plugin_downloaded", { placement, version: WP_PLUGIN_VERSION })}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3.5 text-sm font-semibold transition-colors ${styles}`}
    >
      <Download className="size-4" aria-hidden />
      Download the plugin
      <span className="font-mono text-xs opacity-70">v{WP_PLUGIN_VERSION}</span>
    </a>
  );
}
