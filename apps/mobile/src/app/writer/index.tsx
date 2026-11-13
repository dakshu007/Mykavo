/**
 * AI Writer home - every website, how many keyword ideas and posts it has,
 * and how many posts are left this month. The phone counterpart of the web
 * AI Keywords page; writing and saving to WordPress work from here too.
 */

import { Stack, useRouter } from "expo-router";
import { ChevronRight, PenLine, Sparkles } from "lucide-react-native";
import { Linking, Pressable, Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { Button, Card, CardTitle, Divider, EmptyState, ErrorState, LoadingState, Mono, Small, StatTile } from "@/components/ui";
import { Chip } from "@/components/admin";
import { api } from "@/lib/api";
import { API_BASE } from "@/lib/auth";
import { hostOf } from "@/lib/format";
import { useLive } from "@/lib/live";
import { fonts } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { canWrite, postsLeftLabel } from "@/lib/writer";

export default function WriterHomeScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const { data, error, loading, refreshing, refresh, reload } = useLive(api.writerHome, [], {
    cache: "writer",
    interval: (d) => (d && d.writing > 0 ? 5000 : 0),
  });

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
        <ErrorState
          message={error?.message === "Not found" ? "The AI Writer is not open to your account yet." : (error?.message ?? "Could not load the AI Writer.")}
          onRetry={reload}
        />
      </Screen>
    );
  }

  const a = data.allowance;
  const totalPosts = data.websites.reduce((n, w) => n + w.posts, 0);

  return (
    <Screen title="AI Writer" subtitle="Keyword ideas and blog posts for your sites" refreshing={refreshing} onRefresh={refresh}>
      {header}

      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatTile label="Posts left" value={a.postsLeft === null ? "∞" : a.postsLeft} gradient={palette.gradientMint} caption={<Small>Refills {a.refillsOn}</Small>} />
        <StatTile label="Written" value={totalPosts} gradient={palette.gradientCoral} caption={<Small>{data.writing > 0 ? `${data.writing} writing now` : "All websites"}</Small>} />
      </View>

      {a.blocked ? (
        <Card style={{ backgroundColor: palette.warningSoft }}>
          <Small color={palette.warningStrong}>{a.blocked}</Small>
        </Card>
      ) : !canWrite(a) ? (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} color={palette.accent} />
            <CardTitle>You have used all your posts this month</CardTitle>
          </View>
          <Small color={palette.inkSecondary}>Upgrade to write more posts this month, or wait until {a.refillsOn}.</Small>
          <Button title="Upgrade to write more" size="sm" onPress={() => void Linking.openURL(`${API_BASE}/dashboard/billing?from=ai-writer`)} />
        </Card>
      ) : null}

      <Card>
        <CardTitle style={{ marginBottom: 4 }}>Your websites</CardTitle>
        {data.websites.length === 0 ? (
          <EmptyState title="Add a website first" message="The AI Writer works from the websites you monitor." />
        ) : (
          data.websites.map((w, i) => (
            <View key={w.id}>
              {i > 0 ? <Divider /> : null}
              <Pressable
                onPress={() => router.push(`/writer/${w.id}`)}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}
              >
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: palette.primarySoft, alignItems: "center", justifyContent: "center" }}>
                  <PenLine size={17} color={palette.ink} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <CardTitle numberOfLines={1}>{w.name}</CardTitle>
                  <Mono numberOfLines={1} color={palette.inkFaint} style={{ fontSize: 12, lineHeight: 16 }}>
                    {hostOf(w.url)}
                  </Mono>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {w.ready ? (
                      <Chip label={`${w.ideas} ideas`} fg={palette.ink} bg={palette.surface} />
                    ) : (
                      <Chip label="Set up on the web" fg={palette.warningStrong} bg={palette.warningSoft} />
                    )}
                    <Chip label={`${w.posts} posts`} fg={palette.ink} bg={palette.surface} />
                    {w.wordpress ? <Chip label="WordPress" fg={palette.successStrong} bg={palette.successSoft} /> : null}
                  </View>
                </View>
                <ChevronRight size={16} color={palette.inkFaint} />
              </Pressable>
            </View>
          ))
        )}
      </Card>

      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: palette.inkFaint, textAlign: "center" }}>
        {postsLeftLabel(a)} · {a.reportsLeft === null ? "unlimited" : a.reportsLeft} idea reports left
      </Text>
    </Screen>
  );
}
