/**
 * MyKavo logomark - the spark leaving the page. Direct port of
 * apps/web/src/components/brand/logo.tsx (single-color mark; defaults to
 * brand gold, override via `color`).
 */

import { View, Text, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { fonts, gold } from "@/lib/theme";

export function LogoMark({
  size = 28,
  color = gold.gold,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M5.4 3.3 L13.9 3.3 Q15.6 3.3 14.6 4.45 L3.8 15.45 Q3.25 16 3.8 16.55 L14.6 27.55 Q15.6 28.7 13.9 28.7 L5.4 28.7 Q3.2 28.7 3.2 26.5 L3.2 5.5 Q3.2 3.3 5.4 3.3 Z"
        fill={color}
        stroke={color}
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      <Path
        d="M10.35 16 L19.45 3.4 L15.85 12 L23.7 8.2 L16.55 14.5 L29.1 16 L16.55 17.5 L23.7 23.8 L15.85 20 L19.45 28.6 Z"
        fill={color}
        stroke={color}
        strokeWidth={0.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Logo({
  markSize = 26,
  markColor = gold.gold,
  wordmarkColor,
  style,
}: {
  markSize?: number;
  markColor?: string;
  wordmarkColor: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}>
      <LogoMark size={markSize} color={markColor} />
      <Text
        style={{
          fontFamily: fonts.bodySemiBold,
          fontSize: 17,
          letterSpacing: -0.3,
          color: wordmarkColor,
        }}
      >
        MyKavo
      </Text>
    </View>
  );
}
