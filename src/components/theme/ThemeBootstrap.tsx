"use client";

import { useEffect } from "react";

const THEME_STORAGE_KEY = "rarostock-theme";

export type ColorTheme = "dark" | "light";

export function applyColorTheme(theme: ColorTheme) {
  document.body.classList.toggle("theme-light", theme === "light");
  document.documentElement.style.colorScheme = theme;
}

export function getStoredColorTheme(): ColorTheme {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

export function storeColorTheme(theme: ColorTheme) {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyColorTheme(theme);
}

export function ThemeBootstrap() {
  useEffect(() => {
    applyColorTheme(getStoredColorTheme());
  }, []);

  return null;
}
