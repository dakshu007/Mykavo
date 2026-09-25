"use client";

import { ArrowUpRight } from "lucide-react";
import { track } from "@/lib/analytics";
import { WP_PLUGIN_DIRECTORY_URL, WP_PLUGIN_VERSION } from "@/config/wordpress-plugin";

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

/** The repository address as a plain link, for under a button: shows people where the plugin lives. */
export function WpPluginRepoLink({ placement }: { placement: string }) {
  return (
    <a
      href={WP_PLUGIN_DIRECTORY_URL}
      target="_blank"
      rel="noopener"
      onClick={() => track("wp_plugin_directory_clicked", { placement, version: WP_PLUGIN_VERSION })}
      className="inline-flex items-center gap-1.5 font-mono text-[12px] underline decoration-[#FFD400] decoration-2 underline-offset-4"
    >
      wordpress.org/plugins/mykavo
      <ArrowUpRight className="size-3.5" aria-hidden />
    </a>
  );
}
