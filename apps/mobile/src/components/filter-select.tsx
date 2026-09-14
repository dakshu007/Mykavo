/**
 * A compact filter control: one button showing the current choice, which
 * opens a sheet to change it.
 *
 * Replaces rows of chips. Chips show every option at once, which reads fine
 * with four of them and badly with fifteen - on the Changes screen three chip
 * rows took the top third of the phone and pushed the actual changes below
 * the fold, so the screen spent its best space on controls nobody had touched
 * yet. A button that states its current value costs one line whatever the
 * option count, and the value stays visible instead of being inferred from
 * which chip looks pressed.
 *
 * The sheet rather than a native picker: it can show a description per
 * option, it looks the same on every Android version, and it is the same
 * shape as the confirmation sheets elsewhere in the app.
 */

import { Check, ChevronDown } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CardTitle, Small } from "@/components/ui";
import { useTheme } from "@/lib/theme-context";

export interface FilterOption<T> {
  value: T;
  label: string;
  /** Optional one-liner shown under the label in the sheet. */
  hint?: string;
}

export function FilterSelect<T>({
  label,
  value,
  options,
  onChange,
  /** True when `value` is the unfiltered default - keeps the button quiet. */
  isDefault,
}: {
  label: string;
  value: T;
  options: readonly FilterOption<T>[];
  onChange: (value: T) => void;
  isDefault: boolean;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => Object.is(option.value, value));

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? "any"}. Tap to change.`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingLeft: 12,
          paddingRight: 9,
          paddingVertical: 7,
          borderRadius: 999,
          // An applied filter is tinted, so "am I looking at everything?" is
          // answerable without opening anything.
          backgroundColor: isDefault ? palette.surface : palette.primarySoft,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Small
          color={isDefault ? palette.inkSecondary : palette.accent}
          style={{ fontWeight: "600" }}
          numberOfLines={1}
        >
          {selected?.label ?? label}
        </Small>
        <ChevronDown size={13} color={isDefault ? palette.inkFaint : palette.accent} />
      </Pressable>

      <OptionSheet
        title={label}
        open={open}
        maxHeight={height * 0.7}
        bottomInset={insets.bottom}
        onClose={() => setOpen(false)}
      >
        {options.map((option) => {
          const active = Object.is(option.value, value);
          return (
            <Pressable
              key={String(option.label)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 13,
                paddingHorizontal: 4,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View style={{ flex: 1, gap: 1 }}>
                <CardTitle color={active ? palette.accent : palette.ink}>
                  {option.label}
                </CardTitle>
                {option.hint ? (
                  <Small color={palette.inkSecondary}>{option.hint}</Small>
                ) : null}
              </View>
              {active ? <Check size={17} color={palette.accent} /> : null}
            </Pressable>
          );
        })}
      </OptionSheet>
    </>
  );
}

/**
 * A sheet that slides up from the bottom.
 *
 * Rendered through Modal so it sits above the floating tab bar - that bar is
 * absolutely positioned at a high elevation, and a plain overlay ends up
 * underneath it with the pill floating over the options.
 */
function OptionSheet({
  title,
  open,
  onClose,
  maxHeight,
  bottomInset,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  maxHeight: number;
  bottomInset: number;
  children: React.ReactNode;
}) {
  const { palette } = useTheme();
  // useState, not useRef().current - reading a ref during render is
  // disallowed, and this value only needs creating once.
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 1 : 0,
      duration: open ? 220 : 160,
      // Decelerate on the way in, accelerate on the way out - the sheet
      // arrives gently and leaves without loitering.
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, slide]);

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      // Android's back button must close the sheet, not the screen behind it.
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}
      >
        <Animated.View
          style={{
            opacity: slide,
            transform: [
              { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
            ],
          }}
        >
          {/* Stops a tap inside the sheet from reaching the scrim. */}
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: palette.card,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              paddingHorizontal: 18,
              paddingTop: 10,
              paddingBottom: bottomInset + 14,
            }}
          >
            <View
              style={{
                alignSelf: "center",
                width: 38,
                height: 4,
                borderRadius: 999,
                backgroundColor: palette.inkFaint,
                opacity: 0.4,
                marginBottom: 12,
              }}
            />
            <CardTitle style={{ marginBottom: 2 }}>{title}</CardTitle>
            <ScrollView style={{ maxHeight }} showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
