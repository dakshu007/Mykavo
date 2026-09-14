/**
 * Blog - the admin post list, from the phone.
 *
 * Scoped deliberately to what a phone is good at: see every post and its
 * state, and push a finished draft live. It is NOT an editor. Writing
 * markdown on a touch keyboard is worse than not doing it, and an editor
 * here would mean shipping a second implementation of the web CMS's
 * validation rules that could disagree with it.
 *
 * So the one write it offers is publish/unpublish, which is the thing you
 * actually want away from your desk, and it sends only a status - the phone
 * never holds a post's body, so it cannot overwrite one.
 *
 * Reached from Settings rather than the tab bar: the floating bar is for
 * things you check constantly, and at 48px a tab the bar stops fitting a
 * 360dp phone past six.
 */

import { Stack } from "expo-router";
import { ExternalLink } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, View } from "react-native";

import { Screen } from "@/components/screen";
import {
  Card,
  CardTitle,
  Divider,
  EmptyState,
  ErrorState,
  LoadingState,
  Small,
} from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { API_BASE } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { useLive } from "@/lib/live";
import { useTheme } from "@/lib/theme-context";
import type { BlogPostListItem } from "@/lib/types";

function StatusPill({ status }: { status: BlogPostListItem["status"] }) {
  const { palette } = useTheme();
  const published = status === "PUBLISHED";
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: published ? palette.successSoft : palette.infoSoft,
      }}
    >
      <Small
        color={published ? palette.successStrong : palette.inkSecondary}
        style={{ fontWeight: "600", fontSize: 11 }}
      >
        {published ? "Published" : "Draft"}
      </Small>
    </View>
  );
}

function PostRow({
  post,
  busy,
  onToggle,
  onOpen,
}: {
  post: BlogPostListItem;
  busy: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const { palette } = useTheme();
  const published = post.status === "PUBLISHED";

  return (
    <View style={{ paddingVertical: 12, gap: 8 }}>
      <View style={{ gap: 4 }}>
        <CardTitle numberOfLines={2}>{post.title}</CardTitle>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <StatusPill status={post.status} />
          <Small color={palette.inkSecondary}>Edited {timeAgo(post.updatedAt)}</Small>
        </View>
        {post.excerpt ? (
          <Small color={palette.inkSecondary} numberOfLines={2}>
            {post.excerpt}
          </Small>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          onPress={onToggle}
          disabled={busy}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            flex: 1,
            paddingVertical: 9,
            borderRadius: 12,
            backgroundColor: published ? palette.panel : palette.successSoft,
            opacity: pressed || busy ? 0.7 : 1,
          })}
        >
          {busy ? (
            <ActivityIndicator size="small" color={palette.inkSecondary} />
          ) : (
            <Small
              color={published ? palette.inkSecondary : palette.successStrong}
              style={{ fontWeight: "600" }}
            >
              {published ? "Unpublish" : "Publish"}
            </Small>
          )}
        </Pressable>

        <Pressable
          onPress={onOpen}
          accessibilityLabel={`Edit ${post.title} in the browser`}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingVertical: 9,
            paddingHorizontal: 12,
            borderRadius: 12,
            backgroundColor: palette.panel,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <ExternalLink size={14} color={palette.inkSecondary} />
          <Small color={palette.inkSecondary} style={{ fontWeight: "600" }}>
            Edit
          </Small>
        </Pressable>
      </View>
    </View>
  );
}

export default function BlogScreen() {
  const { palette } = useTheme();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, error, loading, refreshing, refresh, reload } = useLive(api.blogPosts, [], {
    interval: 0,
  });

  async function toggle(post: BlogPostListItem) {
    const next = post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    // Unpublishing removes a live page from the site; publishing makes one
    // public. Neither is a gesture to perform by accident on a phone.
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        next === "PUBLISHED" ? "Publish this post?" : "Unpublish this post?",
        next === "PUBLISHED"
          ? `"${post.title}" becomes visible on mykavo.app and can be indexed by search engines.`
          : `"${post.title}" disappears from mykavo.app. Anyone holding the link gets a 404.`,
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          {
            text: next === "PUBLISHED" ? "Publish" : "Unpublish",
            style: next === "PUBLISHED" ? "default" : "destructive",
            onPress: () => resolve(true),
          },
        ],
      );
    });
    if (!confirmed) return;

    setBusyId(post.id);
    try {
      await api.setBlogPostStatus(post.id, next);
      // Re-read rather than patching local state: the server owns publishedAt
      // and updatedAt, and guessing them here is how a list starts lying.
      await refresh();
    } catch (err) {
      Alert.alert(
        "Could not change the status",
        err instanceof ApiError ? err.message : "Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function openInBrowser(post: BlogPostListItem) {
    void Linking.openURL(`${API_BASE}/dashboard/blog/${encodeURIComponent(post.id)}`);
  }

  const header = <Stack.Screen options={{ title: "Blog" }} />;

  if (loading && !data) {
    return (
      <Screen title="Blog">
        {header}
        <LoadingState />
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen title="Blog">
        {header}
        <ErrorState message={error.message} onRetry={reload} />
      </Screen>
    );
  }

  if (!data) return null;

  return (
    <Screen
      title="Blog"
      subtitle="Publish and unpublish from anywhere"
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {header}
      {data.posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          message="Write your first post in the web editor at mykavo.app, then publish it from here."
        />
      ) : (
        <Card>
          {data.posts.map((post, index) => (
            <View key={post.id}>
              {index > 0 ? <Divider /> : null}
              <PostRow
                post={post}
                busy={busyId === post.id}
                onToggle={() => void toggle(post)}
                onOpen={() => openInBrowser(post)}
              />
            </View>
          ))}
        </Card>
      )}

      <Small color={palette.inkSecondary} style={{ marginTop: 14 }}>
        Writing and editing stay in the web editor — a touch keyboard is the wrong
        tool for markdown. &ldquo;Edit&rdquo; opens the post there.
      </Small>
    </Screen>
  );
}
