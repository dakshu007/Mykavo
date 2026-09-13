/**
 * Core UI primitives - the React Native counterpart of the web dashboard's
 * ui/card.tsx, ui/button.tsx and ui/badge.tsx. Every color flows through the
 * fx palette; never hardcode colors in screens.
 */

import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { useReducedMotion } from "@/lib/reduced-motion";
import { useTheme } from "@/lib/theme-context";
import { cardShadow, radius, type, fonts } from "@/lib/theme";

/* ------------------------------ text ------------------------------------- */

interface TextProps {
  children: ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export function Heading({ children, color, style, numberOfLines }: TextProps) {
  const { palette } = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[type.h1, { color: color ?? palette.ink }, style]}>
      {children}
    </Text>
  );
}

export function SectionTitle({ children, color, style, numberOfLines }: TextProps) {
  const { palette } = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[type.h3, { color: color ?? palette.ink }, style]}>
      {children}
    </Text>
  );
}

export function CardTitle({ children, color, style, numberOfLines }: TextProps) {
  const { palette } = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[type.cardTitle, { color: color ?? palette.ink }, style]}
    >
      {children}
    </Text>
  );
}

export function Body({ children, color, style, numberOfLines }: TextProps) {
  const { palette } = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[type.body, { color: color ?? palette.ink }, style]}>
      {children}
    </Text>
  );
}

export function Small({ children, color, style, numberOfLines }: TextProps) {
  const { palette } = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[type.small, { color: color ?? palette.inkSecondary }, style]}
    >
      {children}
    </Text>
  );
}

/** 11px uppercase tracked label - the web `label-micro` utility. */
export function MicroLabel({ children, color, style }: TextProps) {
  const { palette } = useTheme();
  return (
    <Text style={[type.micro, { color: color ?? palette.inkFaint, textTransform: "uppercase" }, style]}>
      {children}
    </Text>
  );
}

/** Mono text for URLs, paths, HTTP statuses, hashes. */
export function Mono({ children, color, style, numberOfLines }: TextProps) {
  const { palette } = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[type.mono, { color: color ?? palette.inkSecondary }, style]}
    >
      {children}
    </Text>
  );
}

/* ------------------------------ surfaces ---------------------------------- */

export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const { palette, theme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: palette.card,
          borderRadius: radius.card,
          padding: padded ? 20 : 0,
          overflow: padded ? undefined : "hidden",
        },
        cardShadow(theme),
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Stat tile: micro label on top, large value, optional caption + gradient. */
export function StatTile({
  label,
  value,
  caption,
  gradient,
  style,
}: {
  label: string;
  value: string | number;
  caption?: ReactNode;
  gradient?: [string, string, string];
  style?: StyleProp<ViewStyle>;
}) {
  const { palette, theme } = useTheme();
  const inner = (
    <View style={{ padding: 16, gap: 10, minHeight: 96, justifyContent: "space-between" }}>
      <MicroLabel color={gradient && theme === "light" ? "#16181d99" : undefined}>
        {label}
      </MicroLabel>
      <View style={{ gap: 2 }}>
        <Text
          style={{
            fontFamily: fonts.bodySemiBold,
            fontSize: 26,
            lineHeight: 32,
            color: palette.ink,
          }}
        >
          {value}
        </Text>
        {caption ? <View>{caption}</View> : null}
      </View>
    </View>
  );

  if (gradient) {
    return (
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[{ borderRadius: radius.tile, flex: 1 }, cardShadow(theme), style]}
      >
        {inner}
      </LinearGradient>
    );
  }
  return (
    <View
      style={[
        { backgroundColor: palette.card, borderRadius: radius.tile, flex: 1 },
        cardShadow(theme),
        style,
      ]}
    >
      {inner}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { palette } = useTheme();
  return <View style={[{ height: 1, backgroundColor: palette.line }, style]} />;
}

/* ------------------------------ buttons ----------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark" | "danger";
type ButtonSize = "sm" | "md" | "lg";

/** Resting shadow per variant - ink-tinted, stronger on the filled buttons. */
function elevation(theme: "light" | "dark", variant: ButtonVariant) {
  const strong = variant === "primary" || variant === "dark";
  return {
    shadowColor: "#151515",
    shadowOpacity: theme === "dark" ? (strong ? 0.5 : 0.3) : strong ? 0.16 : 0.06,
    shadowRadius: strong ? 8 : 3,
    shadowOffset: { width: 0, height: strong ? 2 : 1 },
    elevation: strong ? 3 : 1,
  } as const;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette, theme } = useTheme();
  const reducedMotion = useReducedMotion();

  const height = size === "sm" ? 36 : size === "md" ? 44 : 48;
  const paddingHorizontal = size === "sm" ? 16 : size === "md" ? 20 : 28;
  const fontSize = size === "sm" ? 13 : size === "md" ? 14 : 15;

  const colors: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
    primary: { bg: palette.primary, text: palette.primaryContrast },
    secondary: { bg: palette.card, text: palette.ink, border: palette.line },
    ghost: { bg: "transparent", text: palette.inkSecondary },
    dark: { bg: palette.ink, text: palette.inkInverse },
    danger: { bg: palette.criticalSoft, text: palette.criticalStrong },
  };
  const c = colors[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height,
          paddingHorizontal,
          borderRadius: radius.pill,
          backgroundColor: c.bg,
          borderWidth: c.border ? 1 : 0,
          borderColor: c.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: disabled || loading ? 0.5 : 1,
          // The shadow is ink-tinted, never gold-tinted: a gold glow under a
          // gold button reads as a blur. It collapses on press so the button
          // feels pressed rather than merely recoloured - and holds still for
          // anyone who asked for reduced motion.
          ...(variant === "ghost" || disabled || loading
            ? null
            : pressed
              ? { shadowOpacity: 0, elevation: 0 }
              : elevation(theme, variant)),
          ...(pressed && !reducedMotion ? { transform: [{ scale: 0.985 }] } : null),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={c.text} />
      ) : (
        <>
          {icon}
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize, color: c.text }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Rounded filter/count pill (web ui/badge.tsx Pill). */
export function Pill({
  label,
  active = false,
  onPress,
  style,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette, theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        {
          borderRadius: radius.pill,
          backgroundColor: active ? palette.ink : palette.card,
          paddingHorizontal: 14,
          paddingVertical: 8,
          opacity: pressed ? 0.85 : 1,
        },
        cardShadow(theme),
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.bodyMedium,
          fontSize: 13,
          color: active ? palette.inkInverse : palette.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ------------------------------ inputs ------------------------------------ */

/** Labeled text field on the fx palette (the dashboard's input pattern). */
export function Field({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  autoFocus,
  autoCapitalize = "none",
  keyboardType,
  mono = false,
  onSubmitEditing,
  returnKeyType,
}: {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  autoCapitalize?: "none" | "sentences" | "words";
  keyboardType?: "default" | "url" | "email-address";
  mono?: boolean;
  onSubmitEditing?: () => void;
  returnKeyType?: "done" | "go" | "next";
}) {
  const { palette } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 13, color: palette.ink }}>
          {label}
        </Text>
        {hint ? <Small color={palette.inkFaint}>{hint}</Small> : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.inkFaint}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        style={{
          height: 48,
          borderWidth: 1,
          borderColor: palette.line,
          borderRadius: radius.field,
          backgroundColor: palette.card,
          paddingHorizontal: 14,
          fontSize: 15,
          fontFamily: mono ? fonts.mono : fonts.body,
          color: palette.ink,
        }}
      />
    </View>
  );
}

/** Tappable row with a checkbox - the page-selection pattern. */
export function CheckRow({
  checked,
  onToggle,
  title,
  subtitle,
  disabled = false,
}: {
  checked: boolean;
  onToggle: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  disabled?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: checked ? 0 : 1.5,
          borderColor: palette.line,
          backgroundColor: checked ? palette.primary : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked ? (
          <Text
            style={{
              fontFamily: fonts.bodyBold,
              fontSize: 13,
              lineHeight: 16,
              color: palette.primaryContrast,
            }}
          >
            {"\u2713"}
          </Text>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>{typeof title === "string" ? <CardTitle numberOfLines={1}>{title}</CardTitle> : title}{subtitle}</View>
    </Pressable>
  );
}

/* ------------------------------ states ------------------------------------ */

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 8, paddingVertical: 40, paddingHorizontal: 24 }}>
      <CardTitle>{title}</CardTitle>
      {message ? (
        <Small style={{ textAlign: "center" }} color={palette.inkSecondary}>
          {message}
        </Small>
      ) : null}
      {action ? <View style={{ marginTop: 8 }}>{action}</View> : null}
    </View>
  );
}

export function LoadingState() {
  const { palette } = useTheme();
  return (
    <View style={{ paddingVertical: 48, alignItems: "center" }}>
      <ActivityIndicator color={palette.accent} />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { palette } = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 12, paddingVertical: 40, paddingHorizontal: 24 }}>
      <CardTitle color={palette.criticalStrong}>Something went wrong</CardTitle>
      <Small style={{ textAlign: "center" }}>{message}</Small>
      {onRetry ? <Button title="Try again" variant="secondary" size="sm" onPress={onRetry} /> : null}
    </View>
  );
}
