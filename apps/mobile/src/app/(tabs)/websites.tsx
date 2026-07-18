/**
 * Websites tab - mobile counterpart of the web dashboard's
 * /dashboard/websites table. One card, one row per website with status,
 * page count, tag chips and a mute indicator.
 */

import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Fragment } from "react";
import { Pressable, Text, View } from "react-native";

import { WebsiteStatusBadge } from "@/components/badges";
import { Screen } from "@/components/screen";
import {
  Card,
  CardTitle,
  Divider,
  EmptyState,
  ErrorState,
  LoadingState,
  Mono,
  Small,
} from "@/components/ui";
import { api } from "@/lib/api";
import { hostOf, isInFuture } from "@/lib/format";
import { useLive } from "@/lib/live";
import { fonts, radius } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";

/** How many tag chips a row shows before collapsing into "+N" (web parity). */
const ROW_TAG_LIMIT = 3;

export default function WebsitesScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const { data, error, loading, refreshing, refresh, reload } = useLive(api.websites, [], {
    interval: 20000,
  });

  const websites = data?.websites ?? [];

  return (
    <Screen
      title="Websites"
      subtitle={data ? `${websites.length} monitored` : undefined}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    >
      {loading && !data ? (
        <LoadingState />
      ) : error && !data ? (
        <ErrorState message={error.message} onRetry={() => void reload()} />
      ) : websites.length === 0 ? (
        <Card>
          <EmptyState
            title="No websites yet"
            message="Add your first website from the dashboard at mykavo.app"
          />
        </Card>
      ) : (
        <Card>
          {websites.map((website, index) => {
            const tags = website.tags ?? [];
            const muted = isInFuture(website.muteAlertsUntil);
            const pageCount = website._count.monitoredPages;
            return (
              <Fragment key={website.id}>
                {index > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => router.push(`/website/${website.id}`)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 12,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <CardTitle numberOfLines={1}>{website.name}</CardTitle>
                    <Mono numberOfLines={1} style={{ fontSize: 12 }} color={palette.inkFaint}>
                      {hostOf(website.url)}
                    </Mono>
                    {tags.length > 0 ? (
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 4,
                        }}
                      >
                        {tags.slice(0, ROW_TAG_LIMIT).map((tag) => (
                          <View
                            key={tag}
                            style={{
                              borderRadius: radius.pill,
                              backgroundColor: palette.surface,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: fonts.bodyMedium,
                                fontSize: 11,
                                color: palette.inkSecondary,
                              }}
                            >
                              {tag}
                            </Text>
                          </View>
                        ))}
                        {tags.length > ROW_TAG_LIMIT ? (
                          <Text
                            style={{
                              fontFamily: fonts.bodyMedium,
                              fontSize: 11,
                              color: palette.inkFaint,
                            }}
                          >
                            +{tags.length - ROW_TAG_LIMIT}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <WebsiteStatusBadge status={website.status} />
                    <Small color={palette.inkFaint}>
                      {pageCount} {pageCount === 1 ? "page" : "pages"}
                    </Small>
                    {muted ? (
                      <View
                        style={{
                          borderRadius: radius.pill,
                          backgroundColor: palette.infoSoft,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: fonts.bodySemiBold,
                            fontSize: 11,
                            color: palette.info,
                          }}
                        >
                          Muted
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <ChevronRight size={16} color={palette.inkFaint} />
                </Pressable>
              </Fragment>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
