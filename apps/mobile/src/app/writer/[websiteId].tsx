/**
 * One website's AI Writer: keyword ideas to write about, the posts already
 * written (and whether each is in WordPress), and the runner while the AI
 * works. Writing a post and finding new ideas start the same jobs the web
 * page starts; profile setup and editing stay on the web.
 */

import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronRight, ExternalLink, Lightbulb, PenLine, RefreshCw } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";

import { Chip } from "@/components/admin";
import { KavoRunner } from "@/components/kavo-runner";
import { Screen } from "@/components/screen";
import { Button, Card, CardTitle, Divider, EmptyState, ErrorState, LoadingState, MicroLabel, Small } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { API_BASE } from "@/lib/auth";
import { hostOf, timeAgo } from "@/lib/format";
import { useLive } from "@/lib/live";
import { fonts } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import type { WriterJobStatus, WriterSiteResponse } from "@/lib/types";
import { canAnalyse, canWrite, draftState, jobFinished, popularityLabel, postsLeftLabel } from "@/lib/writer";

type Tracked = { id: string; kind: "deep" | "write"; keyword?: string };

/** The job to show the runner for: one this screen started, else one already running. */
function runningJob(data: WriterSiteResponse | null, local: Tracked | null): Tracked | null {
  if (local) return local;
  if (!data) return null;
  const writing = Object.entries(data.writing)[0];
  if (writing) return { id: writing[1], kind: "write", keyword: writing[0] };
  const deep = data.jobs.deep;
  if (deep && !jobFinished(deep.status)) return { id: deep.id, kind: "deep" };
  return null;
}

/** Polls one job every 2.5s until it finishes. */
function useJob(job: Tracked | null, onFinished: (status: WriterJobStatus) => void) {
  const [status, setStatus] = useState<WriterJobStatus | null>(null);
  const jobId = job?.id ?? null;
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      try {
        const next = await api.writerJob(jobId);
        if (cancelled) return;
        setStatus(next);
        if (jobFinished(next.status)) {
          onFinished(next);
          return;
        }
      } catch {
        // A missed poll is retried on the next tick.
      }
      if (!cancelled) timer = setTimeout(() => void tick(), 2500);
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // onFinished is recreated per render; the job id is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);
  return jobId && status ? status : null;
}

export default function WriterSiteScreen() {
  const { websiteId } = useLocalSearchParams<{ websiteId: string }>();
  const id = websiteId ?? "";
  const router = useRouter();
  const { palette } = useTheme();
  const [local, setLocal] = useState<Tracked | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  const { data, error, loading, refreshing, refresh, reload } = useLive(() => api.writerSite(id), [id], {
    cache: "writer-site",
    enabled: id !== "",
    interval: 0,
  });

  const job = runningJob(data, local);
  const status = useJob(job, (done) => {
    setLocal(null);
    void reload();
    if (done.status === "failed") {
      Alert.alert("The AI could not finish", done.error ?? "Nothing was charged. Try again.");
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    if (done.kind === "write" && done.resultId) router.push(`/writer/post/${done.resultId}`);
  });

  async function start(input: { kind: "deep" } | { kind: "write"; keyword: string }) {
    const key = input.kind === "write" ? input.keyword : "deep";
    setStarting(key);
    try {
      const res = await api.startWriterJob(id, input);
      setLocal({ id: res.jobId, kind: input.kind, keyword: input.kind === "write" ? input.keyword : undefined });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    } catch (err) {
      Alert.alert("Could not start", err instanceof ApiError || err instanceof Error ? err.message : "Try again.");
    } finally {
      setStarting(null);
    }
  }

  const header = <Stack.Screen options={{ title: "AI Writer" }} />;

  if (loading && !data) {
    return (
      <Screen title="AI Writer">
        {header}
        <LoadingState />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen title="AI Writer">
        {header}
        <ErrorState message={error?.message ?? "Could not load this website."} onRetry={reload} />
      </Screen>
    );
  }

  const a = data.allowance;
  const ready = data.profile?.confirmed === true;
  const ideas = data.report?.opportunities ?? [];
  const webPage = `${API_BASE}/dashboard/keywords/${encodeURIComponent(id)}`;
  const upgrade = a.upgrade;

  return (
    <Screen title={data.website.name} subtitle={hostOf(data.website.url)} refreshing={refreshing} onRefresh={refresh}>
      {header}

      {job ? (
        <Card style={{ gap: 6 }}>
          <MicroLabel>{job.kind === "deep" ? "Finding keyword ideas" : `Writing “${job.keyword ?? "your post"}”`}</MicroLabel>
          <KavoRunner progress={status?.progress ?? 4} step={status?.step ?? "Starting up"} />
          <Small color={palette.inkFaint} style={{ fontSize: 11.5 }}>
            You can leave this screen. The post keeps writing and shows up here when it is done.
          </Small>
        </Card>
      ) : null}

      {!ready ? (
        <Card style={{ gap: 10 }}>
          <CardTitle>Finish setup first</CardTitle>
          <Small color={palette.inkSecondary}>
            Tell MyKavo what this business does once, on the web. After that, ideas and posts work from your phone.
          </Small>
          <Button title="Open setup on the web" size="sm" icon={<ExternalLink size={15} color={palette.primaryContrast} />} onPress={() => void Linking.openURL(webPage)} />
        </Card>
      ) : null}

      {ready ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Lightbulb size={17} color={palette.ink} />
            <CardTitle style={{ flex: 1 }}>What to write next</CardTitle>
            <Small color={palette.inkSecondary}>{postsLeftLabel(a)}</Small>
          </View>
          {data.report?.summary ? (
            <Small color={palette.inkSecondary} style={{ marginBottom: 6 }} numberOfLines={3}>
              {data.report.summary}
            </Small>
          ) : null}
          {ideas.length === 0 ? (
            <EmptyState title="No ideas yet" message="Find keyword ideas for this site. It takes about a minute." />
          ) : (
            ideas.map((idea, i) => {
              const writingThis = Boolean(data.writing[idea.keyword]) || (job?.kind === "write" && job.keyword === idea.keyword);
              return (
                <View key={idea.keyword}>
                  {i > 0 ? <Divider /> : null}
                  <View style={{ paddingVertical: 12, gap: 6 }}>
                    <CardTitle numberOfLines={2}>{idea.keyword}</CardTitle>
                    <Small color={palette.inkSecondary} numberOfLines={2}>
                      {idea.suggestedTitle}
                    </Small>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      <Chip label={popularityLabel(idea.popularity)} fg={palette.ink} bg={palette.surface} />
                      <Chip label={`${idea.competition} competition`} fg={palette.ink} bg={palette.surface} />
                      {idea.position ? <Chip label={`You rank #${Math.round(idea.position)}`} fg={palette.successStrong} bg={palette.successSoft} /> : null}
                    </View>
                    {canWrite(a) ? (
                      <Button
                        title={writingThis ? "Writing..." : "Write this post"}
                        size="sm"
                        variant={i === 0 ? "primary" : "secondary"}
                        disabled={writingThis || Boolean(job)}
                        loading={starting === idea.keyword}
                        icon={<PenLine size={14} color={i === 0 ? palette.primaryContrast : palette.ink} />}
                        onPress={() => void start({ kind: "write", keyword: idea.keyword })}
                        style={{ alignSelf: "flex-start", marginTop: 4 }}
                      />
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
          {data.report && data.report.hiddenCount > 0 ? (
            <Small color={palette.inkFaint} style={{ fontSize: 12 }}>
              {data.report.hiddenCount} more ideas on a bigger plan.
            </Small>
          ) : null}
          {canAnalyse(a) ? (
            <Button
              title={ideas.length ? "Find fresh ideas" : "Find keyword ideas"}
              variant={ideas.length ? "ghost" : "primary"}
              size="sm"
              disabled={Boolean(job)}
              loading={starting === "deep"}
              icon={<RefreshCw size={14} color={ideas.length ? palette.inkSecondary : palette.primaryContrast} />}
              onPress={() => void start({ kind: "deep" })}
              style={{ marginTop: 8 }}
            />
          ) : null}
        </Card>
      ) : null}

      {!canWrite(a) && upgrade ? (
        <Card style={{ gap: 8, backgroundColor: palette.primarySoft }}>
          <CardTitle>Want more posts?</CardTitle>
          <Small color={palette.inkSecondary}>
            {a.blocked ?? `You have used this month's posts. ${upgrade.plan} writes ${upgrade.posts} posts and ${upgrade.reports} idea reports a month.`}
          </Small>
          <Button title={`Upgrade to ${upgrade.plan}`} size="sm" onPress={() => void Linking.openURL(`${API_BASE}/dashboard/billing?from=ai-writer`)} />
        </Card>
      ) : null}

      <Card>
        <CardTitle style={{ marginBottom: 4 }}>Posts</CardTitle>
        {data.posts.length === 0 ? (
          <Small color={palette.inkSecondary}>Posts you write appear here.</Small>
        ) : (
          data.posts.map((post, i) => {
            const state = draftState(post.wpDraft);
            return (
              <View key={post.id}>
                {i > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => router.push(`/writer/post/${post.id}`)}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Small color={palette.ink} style={{ fontFamily: fonts.bodySemiBold }} numberOfLines={2}>
                      {post.title}
                    </Small>
                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                      {state === "saved" ? <Chip label="In WordPress" fg={palette.successStrong} bg={palette.successSoft} /> : null}
                      {state === "waiting" ? <Chip label="Sending to WordPress" fg={palette.warningStrong} bg={palette.warningSoft} /> : null}
                      {state === "outdated" ? <Chip label="WordPress copy is older" fg={palette.warningStrong} bg={palette.warningSoft} /> : null}
                      <Small color={palette.inkFaint} style={{ fontSize: 12 }}>
                        {timeAgo(post.updatedAt)}
                      </Small>
                    </View>
                  </View>
                  <ChevronRight size={16} color={palette.inkFaint} />
                </Pressable>
              </View>
            );
          })
        )}
      </Card>

      {data.wordpress ? (
        <Button
          title="Open WordPress drafts"
          variant="secondary"
          icon={<ExternalLink size={15} color={palette.ink} />}
          onPress={() => void Linking.openURL(data.wordpress?.draftsUrl ?? data.website.url)}
        />
      ) : null}
    </Screen>
  );
}
