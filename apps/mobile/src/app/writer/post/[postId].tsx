/**
 * Read an AI post and send it to WordPress as a draft. The server turns the
 * post into plain text blocks, so nothing here renders HTML. Editing stays on
 * the web (one tap away); once WordPress has the draft, "Open in WP Admin"
 * goes straight to it.
 */

import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams } from "expo-router";
import { CircleCheck, ExternalLink, Pencil, Send } from "lucide-react-native";
import { useState } from "react";
import { Alert, Linking, Text, View } from "react-native";

import { Chip } from "@/components/admin";
import { Screen } from "@/components/screen";
import { Button, Card, CardTitle, ErrorState, LoadingState, MicroLabel, Small } from "@/components/ui";
import { api } from "@/lib/api";
import { API_BASE } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { useLive } from "@/lib/live";
import { fonts } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import type { PostBlock, WriterPostResponse } from "@/lib/types";
import { draftState } from "@/lib/writer";

function Block({ block }: { block: PostBlock }) {
  const { palette } = useTheme();
  switch (block.type) {
    case "h2":
      return <Text style={{ fontFamily: fonts.headingSemiBold, fontSize: 19, lineHeight: 26, color: palette.ink, marginTop: 10 }}>{block.text}</Text>;
    case "h3":
      return <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 23, color: palette.ink, marginTop: 6 }}>{block.text}</Text>;
    case "li":
      return (
        <View style={{ flexDirection: "row", gap: 10, paddingLeft: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.chartGold, marginTop: 9 }} />
          <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: palette.ink }}>{block.text}</Text>
        </View>
      );
    case "quote":
      return (
        <View style={{ borderLeftWidth: 3, borderLeftColor: palette.primary, paddingLeft: 12 }}>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 23, color: palette.inkSecondary }}>{block.text}</Text>
        </View>
      );
    default:
      return <Text style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: palette.ink }}>{block.text}</Text>;
  }
}

function WordPressCard({ post, onChanged }: { post: WriterPostResponse; onChanged: () => void }) {
  const { palette } = useTheme();
  const [sending, setSending] = useState(false);
  const state = draftState(post.wpDraft);

  if (!post.wordpress) {
    return (
      <Card style={{ gap: 8 }}>
        <CardTitle>Save to WordPress</CardTitle>
        <Small color={palette.inkSecondary}>
          Connect this site with the free MyKavo WordPress plugin, and posts land in WP Admin as drafts with one tap.
        </Small>
      </Card>
    );
  }
  if (!post.wordpress.supportsDrafts) {
    return (
      <Card style={{ gap: 8 }}>
        <CardTitle>Update the WordPress plugin</CardTitle>
        <Small color={palette.inkSecondary}>Drafts need MyKavo plugin 1.3.2 or newer. Your site runs {post.wordpress.pluginVersion ?? "an older version"}.</Small>
      </Card>
    );
  }

  async function send() {
    setSending(true);
    try {
      const res = await api.sendToWordPress(post.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      if (res.draft.status === "delivered" && res.draft.editUrl) {
        Alert.alert("Saved in WordPress", "The draft is waiting in WP Admin.", [
          { text: "Later", style: "cancel" },
          { text: "Open it", onPress: () => void Linking.openURL(res.draft.editUrl ?? "") },
        ]);
      }
      onChanged();
    } catch (err) {
      Alert.alert("Not sent", err instanceof Error ? err.message : "Try again.");
    } finally {
      setSending(false);
    }
  }

  const editUrl = post.wpDraft?.editUrl ?? null;

  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <CardTitle style={{ flex: 1 }}>WordPress</CardTitle>
        {state === "saved" ? <Chip label="Draft saved" fg={palette.successStrong} bg={palette.successSoft} /> : null}
        {state === "waiting" ? <Chip label="On its way" fg={palette.warningStrong} bg={palette.warningSoft} /> : null}
        {state === "outdated" ? <Chip label="Older copy" fg={palette.warningStrong} bg={palette.warningSoft} /> : null}
        {state === "failed" ? <Chip label="Failed" fg={palette.criticalStrong} bg={palette.criticalSoft} /> : null}
      </View>

      {state === "saved" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <CircleCheck size={16} color={palette.successStrong} />
          <Small color={palette.inkSecondary} style={{ flex: 1 }}>
            In your drafts{post.wpDraft?.deliveredAt ? ` since ${timeAgo(post.wpDraft.deliveredAt)}` : ""}. Review it there and press Publish.
          </Small>
        </View>
      ) : state === "waiting" ? (
        <Small color={palette.inkSecondary}>The site picks it up the next time WordPress checks in, usually within seconds.</Small>
      ) : state === "outdated" ? (
        <Small color={palette.inkSecondary}>You edited the post after sending it. Send again to update the same draft.</Small>
      ) : state === "failed" ? (
        <Small color={palette.criticalStrong}>{post.wpDraft?.error ?? "WordPress could not save it."}</Small>
      ) : (
        <Small color={palette.inkSecondary}>Send it to WP Admin as a draft, with title, meta description and FAQ schema.</Small>
      )}

      {editUrl && (state === "saved" || state === "outdated") ? (
        <Button title="Open in WP Admin" icon={<ExternalLink size={15} color={palette.primaryContrast} />} onPress={() => void Linking.openURL(editUrl)} />
      ) : null}
      {state !== "saved" ? (
        <Button
          title={state === "none" ? "Save as WordPress draft" : "Send again"}
          variant={editUrl ? "secondary" : "primary"}
          loading={sending}
          icon={<Send size={15} color={editUrl ? palette.ink : palette.primaryContrast} />}
          onPress={() => void send()}
        />
      ) : null}
    </Card>
  );
}

export default function WriterPostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const id = postId ?? "";
  const { palette } = useTheme();
  const { data, error, loading, refreshing, refresh, reload } = useLive(() => api.writerPost(id), [id], {
    cache: "writer-post",
    enabled: id !== "",
    // Poll only while WordPress has not collected the draft yet.
    interval: (d) => (d?.wpDraft?.status === "queued" ? 4000 : 0),
  });

  const header = <Stack.Screen options={{ title: "Post" }} />;

  if (loading && !data) {
    return (
      <Screen title="Post">
        {header}
        <LoadingState />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen title="Post">
        {header}
        <ErrorState message={error?.message ?? "Could not load this post."} onRetry={reload} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {header}
      <View style={{ gap: 8 }}>
        <MicroLabel>{data.keyword}</MicroLabel>
        <Text style={{ fontFamily: fonts.headingSemiBold, fontSize: 24, lineHeight: 31, color: palette.ink }}>{data.title}</Text>
        <Small color={palette.inkSecondary}>
          {data.words.toLocaleString()} words · about {Math.max(1, Math.round(data.words / 230))} min read · {timeAgo(data.updatedAt)}
        </Small>
      </View>

      <WordPressCard post={data} onChanged={() => void reload()} />

      {data.metaDescription ? (
        <Card style={{ gap: 6 }}>
          <MicroLabel>Google snippet</MicroLabel>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: palette.info }} numberOfLines={2}>
            {data.title}
          </Text>
          <Small color={palette.inkSecondary}>{data.metaDescription}</Small>
        </Card>
      ) : null}

      <Card style={{ gap: 12 }}>
        {data.blocks.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </Card>

      {data.faq.length > 0 ? (
        <Card style={{ gap: 12 }}>
          <CardTitle>FAQ</CardTitle>
          {data.faq.map((f) => (
            <View key={f.question} style={{ gap: 4 }}>
              <Small color={palette.ink} style={{ fontFamily: fonts.bodySemiBold }}>
                {f.question}
              </Small>
              <Small color={palette.inkSecondary}>{f.answer}</Small>
            </View>
          ))}
        </Card>
      ) : null}

      <Button
        title="Edit on the web"
        variant="secondary"
        icon={<Pencil size={15} color={palette.ink} />}
        onPress={() => void Linking.openURL(`${API_BASE}/dashboard/keywords/${encodeURIComponent(data.websiteId)}/posts/${encodeURIComponent(data.id)}`)}
      />
    </Screen>
  );
}
