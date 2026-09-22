/**
 * Users - who has signed up for this MyKavo installation.
 *
 * The phone counterpart of the web dashboard's Users page, reading the same
 * report from the same collector so the two can never disagree.
 *
 * Operator-only, and reached from Settings rather than the tab bar: at 48px a
 * tab the floating bar stops fitting a 360dp phone past six, and this is a
 * screen you open when a signup notification arrives rather than one you check
 * constantly.
 *
 * Activation carries the screen. A signup that never added a website is not a
 * customer yet, and "12 signups" is a vanity figure where "12 signups, 3 of
 * whom added a website" is the one that says whether the product is landing -
 * so every row states which it is, and the header states the ratio.
 */

import { Stack } from "expo-router";
import { CircleCheck, CircleDashed } from "lucide-react-native";
import { View } from "react-native";

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
import { timeAgo } from "@/lib/format";
import { useLive } from "@/lib/live";
import { useTheme } from "@/lib/theme-context";
import type { SignupRow } from "@/lib/types";

function websiteLabel(count: number): string {
  if (count === 0) return "no websites";
  return `${count} website${count === 1 ? "" : "s"}`;
}

function UserRow({ row }: { row: SignupRow }) {
  const { palette } = useTheme();
  const Icon = row.activated ? CircleCheck : CircleDashed;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 11,
      }}
    >
      <Icon
        size={16}
        color={row.activated ? palette.success : palette.inkFaint}
        strokeWidth={2.2}
      />
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Small color={palette.ink} style={{ fontWeight: "600" }} numberOfLines={1}>
          {row.name}
        </Small>
        {/* Monospaced so an address you are about to type into a mail client
            is readable character by character. */}
        <Mono numberOfLines={1}>{row.email}</Mono>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Small color={palette.inkSecondary}>{timeAgo(row.joinedAt)}</Small>
        <Small color={palette.inkFaint} style={{ fontSize: 11.5 }}>
          {websiteLabel(row.websites)}
        </Small>
      </View>
    </View>
  );
}

export default function UsersScreen() {
  const { palette } = useTheme();
  // No polling: a signup arrives as a push notification, so the list is read
  // when you open it and when you pull down - not on a timer in your pocket.
  const { data, error, loading, refreshing, refresh, reload } = useLive(api.users, [], {
    interval: 0,
  });

  const header = <Stack.Screen options={{ title: "Users" }} />;

  if (loading && !data) {
    return (
      <Screen title="Users">
        {header}
        <LoadingState />
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen title="Users">
        {header}
        <ErrorState message={error.message} onRetry={reload} />
      </Screen>
    );
  }

  if (!data) return null;

  const activated = data.rows.filter((row) => row.activated).length;
  const subtitle =
    data.total === 1 ? "1 account" : `${data.total} accounts`;

  return (
    <Screen
      title="Users"
      subtitle={
        data.lastSevenDays > 0
          ? `${subtitle} · +${data.lastSevenDays} this week`
          : subtitle
      }
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {header}

      {data.error ? (
        // Naming the failure rather than rendering an empty list: "nobody has
        // signed up" and "we could not read the users" look identical
        // otherwise, and only one of them is worth doing something about.
        <ErrorState message={`Could not read the user list: ${data.error}`} onRetry={reload} />
      ) : data.rows.length === 0 ? (
        <EmptyState
          title="Nobody has signed up yet"
          message="New accounts appear here, newest first, and send you a push notification as they are created."
        />
      ) : (
        <>
          <Card>
            <CardTitle style={{ marginBottom: 2 }}>Recent signups</CardTitle>
            <Small color={palette.inkSecondary}>
              {activated} of the {data.rows.length} most recent{" "}
              {data.rows.length === 1 ? "has" : "have"} added a website.
            </Small>
            <Divider />
            {data.rows.map((row, index) => (
              <View key={row.id}>
                {index > 0 ? <Divider /> : null}
                <UserRow row={row} />
              </View>
            ))}
          </Card>

          <Small color={palette.inkSecondary} style={{ marginTop: 14 }}>
            A filled circle means the account has added at least one website — the
            line between a signup and a user. Pull down to re-read.
          </Small>
        </>
      )}
    </Screen>
  );
}
