/**
 * Sign in - styled after the marketing site's v4 "bright gold" system:
 * warm paper canvas, white card with a crisp ink offset shadow, gold CTA
 * with ink text, mono eyebrow label. Handles the same TOTP 2FA challenge
 * flow as the web login form (trust-device on by default).
 */

import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LogoMark } from "@/components/logo";
import { authClient, useSession, API_BASE } from "@/lib/auth";
import { fonts, gold, radius } from "@/lib/theme";

type Step = "credentials" | "totp" | "backup";

/** White card with the v4 hard ink offset shadow ("cardPop"). */
function PopCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ position: "relative" }}>
      <View
        style={{
          position: "absolute",
          top: 6,
          left: 6,
          right: -6,
          bottom: -6,
          borderRadius: 16,
          backgroundColor: gold.ink,
        }}
      />
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: gold.ink,
          backgroundColor: gold.elevated,
          padding: 24,
          gap: 16,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure = false,
  keyboardType,
  autoFocus = false,
  mono = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: "email-address" | "number-pad";
  autoFocus?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 13, color: gold.ink }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={gold.dim}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        style={{
          borderWidth: 1,
          borderColor: "#15151526",
          borderRadius: radius.field,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          fontFamily: mono ? fonts.mono : fonts.body,
          color: gold.ink,
          backgroundColor: gold.canvas,
        }}
      />
    </View>
  );
}

function GoldButton({
  title,
  onPress,
  loading = false,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        height: 48,
        borderRadius: radius.pill,
        backgroundColor: gold.gold,
        borderWidth: 1,
        borderColor: gold.ink,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.9 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={gold.ink} />
      ) : (
        <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 15, color: gold.ink }}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: session, isPending } = useSession();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isPending && session) {
    return <Redirect href="/(tabs)" />;
  }

  async function submitCredentials() {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });
      if (res.error) {
        setError(res.error.message || "Sign in failed. Check your credentials.");
        return;
      }
      const data = res.data as { twoFactorRedirect?: boolean } | null;
      if (data?.twoFactorRedirect) {
        setStep("totp");
        setCode("");
        return;
      }
      router.replace("/(tabs)");
    } catch {
      setError(`Could not reach ${API_BASE}. Check your connection.`);
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(kind: "totp" | "backup") {
    const trimmed = code.trim();
    if (!trimmed) {
      setError(kind === "totp" ? "Enter the 6-digit code." : "Enter a backup code.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res =
        kind === "totp"
          ? await authClient.twoFactor.verifyTotp({ code: trimmed, trustDevice })
          : await authClient.twoFactor.verifyBackupCode({ code: trimmed });
      if (res.error) {
        setError(res.error.message || "That code didn't work. Try again.");
        return;
      }
      router.replace("/(tabs)");
    } catch {
      setError("Verification failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: gold.canvas }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 48,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
          gap: 28,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", gap: 16 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              backgroundColor: gold.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogoMark size={36} />
          </View>
          <View style={{ alignItems: "center", gap: 6 }}>
            <Text
              style={{
                fontFamily: fonts.mono,
                fontSize: 11,
                letterSpacing: 2.2,
                textTransform: "uppercase",
                color: gold.dim,
              }}
            >
              {"// your digital guardian //"}
            </Text>
            <Text
              style={{
                fontFamily: fonts.heading,
                fontSize: 30,
                letterSpacing: -0.5,
                color: gold.ink,
                textAlign: "center",
              }}
            >
              {step === "credentials" ? "Welcome back" : "Two-factor check"}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: gold.dim, textAlign: "center" }}>
              {step === "credentials"
                ? "Sign in to your MyKavo workspace."
                : step === "totp"
                  ? "Enter the 6-digit code from your authenticator app."
                  : "Enter one of your single-use backup codes."}
            </Text>
          </View>
        </View>

        <PopCard>
          {error ? (
            <View
              style={{
                borderRadius: 12,
                backgroundColor: "#fdeaeb",
                borderWidth: 1,
                borderColor: "#e5484d55",
                padding: 12,
              }}
            >
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: "#b91c1c" }}>
                {error}
              </Text>
            </View>
          ) : null}

          {step === "credentials" ? (
            <>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@agency.com"
                keyboardType="email-address"
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                secure
              />
              <GoldButton title="Sign in" onPress={() => void submitCredentials()} loading={busy} />
            </>
          ) : (
            <>
              <Field
                label={step === "totp" ? "Authentication code" : "Backup code"}
                value={code}
                onChangeText={setCode}
                placeholder={step === "totp" ? "123456" : "xxxxx-xxxxx"}
                keyboardType={step === "totp" ? "number-pad" : undefined}
                autoFocus
                mono
              />
              {step === "totp" ? (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: fonts.body, fontSize: 14, color: gold.ink }}>
                    Trust this device for 30 days
                  </Text>
                  <Switch
                    value={trustDevice}
                    onValueChange={setTrustDevice}
                    trackColor={{ true: gold.gold, false: "#15151522" }}
                    thumbColor={gold.ink}
                  />
                </View>
              ) : null}
              <GoldButton
                title="Verify"
                onPress={() => void submitCode(step === "totp" ? "totp" : "backup")}
                loading={busy}
              />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Pressable
                  onPress={() => {
                    setStep(step === "totp" ? "backup" : "totp");
                    setCode("");
                    setError(null);
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: gold.dim }}>
                    {step === "totp" ? "Use a backup code" : "Use authenticator code"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setStep("credentials");
                    setCode("");
                    setError(null);
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: gold.dim }}>
                    Start over
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </PopCard>

        {step === "credentials" ? (
          <Pressable onPress={() => void Linking.openURL("https://mykavo.app/signup")}>
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 13,
                color: gold.dim,
                textAlign: "center",
              }}
            >
              New to MyKavo?{" "}
              <Text style={{ fontFamily: fonts.bodySemiBold, color: gold.ink }}>
                Create your account at mykavo.app
              </Text>
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
