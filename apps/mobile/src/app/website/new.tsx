/**
 * Add a website - the app's biggest missing piece.
 *
 * Until now the empty state told people to go and use mykavo.app in a browser,
 * which is a dead end on the device they just installed the app on: nobody
 * finishes onboarding that way.
 *
 * Drives the same three endpoints as the web wizard
 * (apps/web/src/app/dashboard/websites/new/add-website-wizard.tsx), in the
 * same order, so the two cannot drift: create -> discover -> choose pages.
 * The baseline scan is deliberately NOT started here; it belongs to the
 * website screen's "Run scan", exactly as on the web.
 */

import { useRouter } from "expo-router";
import { AlertTriangle, ArrowLeft, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { Screen } from "@/components/screen";
import {
  Body,
  Button,
  Card,
  CardTitle,
  CheckRow,
  Divider,
  Field,
  MicroLabel,
  Mono,
  Small,
} from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useLive } from "@/lib/live";
import { radius } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import type { DiscoveredPage } from "@/lib/types";

/** Human wording for a discovery source. */
const SOURCE_LABELS: Record<string, string> = {
  homepage: "Homepage",
  sitemap: "Sitemap",
  "sitemap-index": "Sitemap",
  link: "Homepage link",
  crawl: "Internal link",
  manual: "Added manually",
};

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? "/" : u.pathname + u.search;
  } catch {
    return url;
  }
}

export default function NewWebsiteScreen() {
  const router = useRouter();
  const { palette } = useTheme();

  const [step, setStep] = useState<"url" | "select">("url");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [websiteId, setWebsiteId] = useState("");
  const [pages, setPages] = useState<DiscoveredPage[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState("");

  // The plan's per-website page budget, so selection can stop at the limit
  // here instead of failing server-side after the user has chosen.
  const { data: me } = useLive(api.me, [], { interval: 0 });
  const pageBudget = me?.plan.limits.pagesPerSite ?? null;

  const atBudget = pageBudget !== null && selected.size >= pageBudget;

  const grouped = useMemo(
    () =>
      pages.map((p) => ({
        ...p,
        path: pathOf(p.url),
        label: SOURCE_LABELS[p.source] ?? p.source,
      })),
    [pages],
  );

  async function handleFind() {
    if (busy || url.trim().length === 0) return;
    setBusy(true);
    setError("");
    try {
      setPhase("Checking the URL…");
      const created = await api.createWebsite({
        url: url.trim(),
        name: name.trim() || undefined,
      });
      setWebsiteId(created.website.id);

      setPhase("Looking for pages - sitemaps and homepage links…");
      const discovery = await api.discoverPages(created.website.id);
      setPages(discovery.pages);
      setWarnings(discovery.warnings);
      setTruncated(discovery.truncated);
      // Pre-select from the top (the homepage comes first) up to the budget.
      const budget = pageBudget ?? discovery.pages.length;
      setSelected(new Set(discovery.pages.slice(0, budget).map((p) => p.url)));
      setStep("select");
    } catch (err) {
      // A 409 means the site is already here; a 403 is the plan limit. Both
      // carry a real message from the server - show it rather than "failed".
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Something went wrong.",
      );
    } finally {
      setBusy(false);
      setPhase("");
    }
  }

  async function handleSave() {
    if (busy || selected.size === 0) return;
    setBusy(true);
    setError("");
    try {
      await api.setMonitoredPages(
        websiteId,
        [...selected].map((u) => ({ url: u })),
      );
      // replace(), not push(): going "back" to a finished wizard whose website
      // already exists would only offer to create it again.
      router.replace(`/website/${websiteId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  function toggle(pageUrl: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pageUrl)) {
        next.delete(pageUrl);
      } else {
        if (pageBudget !== null && next.size >= pageBudget) return prev;
        next.add(pageUrl);
      }
      return next;
    });
  }

  const back = (
    <Pressable
      onPress={() => (step === "select" ? router.replace("/(tabs)/websites") : router.back())}
      hitSlop={10}
      style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
    >
      <ArrowLeft size={15} color={palette.inkSecondary} />
      <Small>{step === "select" ? "Websites" : "Back"}</Small>
    </Pressable>
  );

  const errorBanner = error ? (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        padding: 14,
        borderRadius: radius.field,
        backgroundColor: palette.criticalSoft,
      }}
    >
      <AlertTriangle size={17} color={palette.criticalStrong} />
      <Small color={palette.criticalStrong} style={{ flex: 1 }}>
        {error}
      </Small>
    </View>
  ) : null;

  if (step === "url") {
    return (
      <Screen title="Add a website" subtitle="Paste the address and MyKavo finds the pages.">
        {back}
        <Card>
          <View style={{ gap: 16 }}>
            <Field
              label="Website URL"
              value={url}
              onChangeText={setUrl}
              placeholder="example.com"
              keyboardType="url"
              mono
              autoFocus
              returnKeyType="go"
              onSubmitEditing={() => void handleFind()}
            />
            <Field
              label="Name"
              hint="optional"
              value={name}
              onChangeText={setName}
              placeholder="Client site"
              autoCapitalize="words"
            />
            {errorBanner}
            <Button
              title={busy ? "Working…" : "Find pages"}
              icon={busy ? undefined : <Search size={16} color={palette.primaryContrast} />}
              loading={busy}
              onPress={() => void handleFind()}
            />
            {phase ? <Small style={{ textAlign: "center" }}>{phase}</Small> : null}
          </View>
        </Card>
        {pageBudget !== null ? (
          <Small color={palette.inkFaint} style={{ textAlign: "center" }}>
            Your {me?.plan.name} plan monitors up to {pageBudget} pages per website.
          </Small>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen
      title="Choose pages"
      subtitle={
        pageBudget !== null
          ? `${selected.size} of ${pageBudget} selected`
          : `${selected.size} selected`
      }
    >
      {back}

      {warnings.length > 0 || truncated ? (
        <View
          style={{
            gap: 6,
            padding: 14,
            borderRadius: radius.field,
            backgroundColor: palette.warningSoft,
          }}
        >
          {warnings.map((w) => (
            <Small key={w} color={palette.warningStrong}>
              {w}
            </Small>
          ))}
          {truncated ? (
            <Small color={palette.warningStrong}>
              This site has more pages than we list here. Add the rest from the website&apos;s
              Pages screen later.
            </Small>
          ) : null}
        </View>
      ) : null}

      {grouped.length === 0 ? (
        <Card>
          <CardTitle style={{ marginBottom: 6}}>No pages found</CardTitle>
          <Body>
            We reached the site but could not find any pages to monitor. That usually means the
            homepage has no internal links and no sitemap.
          </Body>
          <Button
            title="Open the website"
            variant="secondary"
            onPress={() => router.replace(`/website/${websiteId}`)}
            style={{ marginTop: 14 }}
          />
        </Card>
      ) : (
        <Card>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <MicroLabel>{grouped.length} pages found</MicroLabel>
            <Pressable
              onPress={() =>
                setSelected(
                  selected.size > 0
                    ? new Set()
                    : new Set(
                        grouped.slice(0, pageBudget ?? grouped.length).map((p) => p.url),
                      ),
                )
              }
              hitSlop={8}
            >
              <Small color={palette.accent}>
                {selected.size > 0 ? "Clear all" : "Select all"}
              </Small>
            </Pressable>
          </View>
          {grouped.map((page, i) => {
            const checked = selected.has(page.url);
            return (
              <View key={page.url}>
                {i > 0 ? <Divider /> : null}
                <CheckRow
                  checked={checked}
                  // At the budget, only already-selected rows stay tappable -
                  // so the limit is visible instead of silently ignoring taps.
                  disabled={!checked && atBudget}
                  onToggle={() => toggle(page.url)}
                  title={
                    <Mono numberOfLines={1} color={palette.ink}>
                      {page.path}
                    </Mono>
                  }
                  subtitle={<Small color={palette.inkFaint}>{page.label}</Small>}
                />
              </View>
            );
          })}
        </Card>
      )}

      {errorBanner}

      {grouped.length > 0 ? (
        <Button
          title={
            selected.size === 0
              ? "Select at least one page"
              : `Monitor ${selected.size} page${selected.size === 1 ? "" : "s"}`
          }
          disabled={selected.size === 0}
          loading={busy}
          onPress={() => void handleSave()}
        />
      ) : null}
    </Screen>
  );
}
