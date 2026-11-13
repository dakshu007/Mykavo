/**
 * The Kavo runner - the web's "My-Kaa-Vooo!" loader, for the phone. A stick
 * figure runs along a progress track while its shout stretches with the
 * progress. Frame-based (three poses swapped on a timer) rather than worklet
 * animation, so it costs nothing on the UI thread and cannot crash a release
 * build. With reduced motion it stands still and the bar still fills.
 */

import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

import { useReducedMotion } from "@/lib/reduced-motion";
import { fonts, radius } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";

/** Leg/arm end points per frame: [frontLeg, backLeg, frontArm, backArm]. */
const FRAMES: [string, string, [number, number], [number, number]][] = [
  ["18,27 24,35 21,44", "18,27 13,36 6,40", [30, 22], [13, 22]],
  ["18,27 20,36 18,44", "18,27 16,36 13,44", [26, 25], [16, 25]],
  ["18,27 13,36 6,40", "18,27 24,35 21,44", [13, 22], [30, 22]],
  ["18,27 16,36 13,44", "18,27 20,36 18,44", [16, 25], [26, 25]],
];

export function shoutFor(progress: number): string {
  const p = Math.max(0, Math.min(100, progress));
  if (p >= 100) return "Done!";
  return `My-K${"a".repeat(2 + Math.min(4, Math.floor(p / 22)))}-V${"o".repeat(2 + Math.min(5, Math.floor(p / 18)))}!`;
}

function Runner({ frame, color, faint }: { frame: number; color: string; faint: string }) {
  const [front, back, armF, armB] = FRAMES[frame % FRAMES.length];
  return (
    <Svg width={34} height={41} viewBox="0 0 40 48">
      <Polyline points={back} fill="none" stroke={faint} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={21} y1={16} x2={armB[0]} y2={armB[1]} stroke={faint} strokeWidth={4} strokeLinecap="round" />
      <Line x1={22} y1={14} x2={18} y2={27} stroke={color} strokeWidth={4.5} strokeLinecap="round" />
      <Circle cx={25} cy={7} r={5.5} fill={color} />
      <Line x1={21} y1={16} x2={armF[0]} y2={armF[1]} stroke={color} strokeWidth={4} strokeLinecap="round" />
      <Polyline points={front} fill="none" stroke={color} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function KavoRunner({ progress, step, compact = false }: { progress: number; step?: string | null; compact?: boolean }) {
  const { palette } = useTheme();
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setFrame((f) => f + 1), 110);
    return () => clearInterval(t);
  }, [reduced]);

  const p = Math.max(3, Math.min(100, progress));
  const runnerX = Math.max(0, (width - 34) * (p / 100));
  const flip = p > 55;

  return (
    <View style={{ gap: 8 }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(p) }}>
      <View style={{ height: compact ? 58 : 92, justifyContent: "flex-end" }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={{ position: "absolute", left: runnerX, bottom: 12 }}>
          {!compact ? (
            <View
              style={{
                position: "absolute",
                bottom: 46,
                ...(flip ? { right: 0 } : { left: 10 }),
                backgroundColor: palette.primary,
                borderRadius: radius.field,
                paddingHorizontal: 11,
                paddingVertical: 5,
                transform: [{ rotate: frame % 2 === 0 ? "-2deg" : "2deg" }],
              }}
            >
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: palette.primaryContrast }} numberOfLines={1}>
                {shoutFor(progress)}
              </Text>
            </View>
          ) : null}
          <View style={{ transform: [{ translateY: frame % 2 === 0 ? 0 : -2 }] }}>
            <Runner frame={reduced ? 1 : frame} color={palette.chartGold} faint={palette.accent} />
          </View>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: palette.surface, overflow: "hidden" }}>
          <View style={{ width: `${p}%`, height: 8, borderRadius: 4, backgroundColor: palette.primary }} />
        </View>
      </View>
      {step ? (
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: palette.inkSecondary }} numberOfLines={1}>
          {step}
        </Text>
      ) : null}
    </View>
  );
}
