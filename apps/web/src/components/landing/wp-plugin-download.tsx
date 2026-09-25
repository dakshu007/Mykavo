"use client";

import { ArrowUpRight, Download } from "lucide-react";
import { track } from "@/lib/analytics";
import {
  WP_PLUGIN_DIRECTORY_URL,
  WP_PLUGIN_DOWNLOAD_PATH,
  WP_PLUGIN_VERSION,
} from "@/config/wordpress-plugin";

/** The main install action: the plugin's WordPress.org listing, counted per placement. */
export function WpPluginInstall({
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
      href={WP_PLUGIN_DIRECTORY_URL}
      target="_blank"
      rel="noopener"
      onClick={() => track("wp_plugin_directory_clicked", { placement, version: WP_PLUGIN_VERSION })}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3.5 text-sm font-semibold transition-colors ${styles}`}
    >
      Get it on WordPress.org
      <ArrowUpRight className="size-4" aria-hidden />
    </a>
  );
}

/** The same plugin as a zip, for manual installs, counted so we know the page converts. */
export function WpPluginDownload({
  placement,
  variant = "gold",
}: {
  placement: string;
  variant?: "gold" | "ink" | "text";
}) {
  const onClick = () => track("wp_plugin_downloaded", { placement, version: WP_PLUGIN_VERSION });
  if (variant === "text") {
    return (
      <a
        href={WP_PLUGIN_DOWNLOAD_PATH}
        download={`mykavo-${WP_PLUGIN_VERSION}.zip`}
        onClick={onClick}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium underline decoration-[#FFD400] decoration-2 underline-offset-4"
      >
        <Download className="size-3.5" aria-hidden />
        Or download the zip
        <span className="font-mono text-[11px] opacity-70">v{WP_PLUGIN_VERSION}</span>
      </a>
    );
  }
  const styles =
    variant === "gold"
      ? "border-[#151515] bg-[#FFD400] text-[#151515] shadow-[4px_4px_0_#151515] hover:bg-[#ffe14d]"
      : "border-[#151515] bg-[#151515] text-[#F5F5F0] hover:bg-[#2a2a2a]";
  return (
    <a
      href={WP_PLUGIN_DOWNLOAD_PATH}
      download={`mykavo-${WP_PLUGIN_VERSION}.zip`}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3.5 text-sm font-semibold transition-colors ${styles}`}
    >
      <Download className="size-4" aria-hidden />
      Download the plugin
      <span className="font-mono text-xs opacity-70">v{WP_PLUGIN_VERSION}</span>
    </a>
  );
}
