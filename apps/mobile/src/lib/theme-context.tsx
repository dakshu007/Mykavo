/**
 * Theme provider: follows the system scheme by default with a manual
 * light/dark override persisted on device - the same model as the web
 * dashboard (localStorage "mykavo-theme"; absent = follow system).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

import { darkPalette, lightPalette, type FxPalette, type ThemeName } from "./theme";

const STORAGE_KEY = "mykavo-theme";

export type ThemePreference = "system" | ThemeName;

interface ThemeContextValue {
  theme: ThemeName;
  palette: FxPalette;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  palette: lightPalette,
  preference: "system",
  setPreference: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark") setPreferenceState(stored);
    });
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    if (pref === "system") {
      void AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      void AsyncStorage.setItem(STORAGE_KEY, pref);
    }
  }, []);

  const theme: ThemeName =
    preference === "system" ? (system === "dark" ? "dark" : "light") : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      palette: theme === "dark" ? darkPalette : lightPalette,
      preference,
      setPreference,
    }),
    [theme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
