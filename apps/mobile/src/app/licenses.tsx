/**
 * Open source licences.
 *
 * MIT, ISC, BSD and Apache all require their copyright and permission notices
 * to travel with a redistribution, and shipping an APK is a redistribution.
 * Putting them in the app - rather than only in the repo - is what actually
 * discharges that for the people who receive the build.
 *
 * The list is generated from the real production dependency tree by
 * `npm run notices`; CI fails if it has drifted. Full licence texts are in
 * THIRD-PARTY-NOTICES.md, linked below, because ~100 distinct texts is far
 * more than anyone will scroll on a phone.
 */

import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Linking, Pressable, View } from "react-native";

import { Screen } from "@/components/screen";
import { Body, Card, CardTitle, Divider, Field, MicroLabel, Mono, Small } from "@/components/ui";
import { LICENSE_SUMMARY, THIRD_PARTY_PACKAGES } from "@/lib/licenses.generated";
import { useTheme } from "@/lib/theme-context";

const NOTICES_URL =
  "https://github.com/dakshu007/Mykavo-app-download/blob/main/THIRD-PARTY-NOTICES.md";

export default function LicensesScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return THIRD_PARTY_PACKAGES;
    return THIRD_PARTY_PACKAGES.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.license.toLowerCase().includes(needle),
    );
  }, [query]);

  return (
    <Screen
      title="Open source licences"
      subtitle={`${THIRD_PARTY_PACKAGES.length} packages ship inside MyKavo`}
    >
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
      >
        <ArrowLeft size={15} color={palette.inkSecondary} />
        <Small>Settings</Small>
      </Pressable>

      <Card>
        <Body>
          MyKavo is built on open-source software. These are the packages it
          distributes, with the licence each is published under.
        </Body>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
          {LICENSE_SUMMARY.map(([id, count]) => (
            <View
              key={id}
              style={{
                borderRadius: 9999,
                backgroundColor: palette.surface,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Small color={palette.ink}>
                {id} · {count}
              </Small>
            </View>
          ))}
        </View>
        <Pressable
          onPress={() => void Linking.openURL(NOTICES_URL)}
          hitSlop={8}
          style={{ marginTop: 14 }}
        >
          <Small color={palette.accent}>Read the full licence texts</Small>
        </Pressable>
      </Card>

      <Field
        label="Find a package"
        value={query}
        onChangeText={setQuery}
        placeholder="react, MIT, expo…"
      />

      <Card>
        {matches.length === 0 ? (
          <Small>No package matches “{query.trim()}”.</Small>
        ) : (
          matches.map((pkg, i) => (
            <View key={`${pkg.name}@${pkg.version}`}>
              {i > 0 ? <Divider /> : null}
              <View style={{ paddingVertical: 10, gap: 3 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <CardTitle numberOfLines={1} style={{ flex: 1 }}>
                    {pkg.name}
                  </CardTitle>
                  <Mono color={palette.inkFaint}>{pkg.version}</Mono>
                </View>
                <MicroLabel>{pkg.license}</MicroLabel>
                {pkg.copyright ? (
                  <Small color={palette.inkFaint} numberOfLines={2}>
                    {pkg.copyright}
                  </Small>
                ) : null}
              </View>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
