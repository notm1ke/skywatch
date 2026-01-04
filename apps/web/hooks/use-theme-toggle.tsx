"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";

interface Animation {
  name: string;
  css: string;
}

export const createAnimation = (): Animation => {
  const svg = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><filter id="blur"><feGaussianBlur stdDeviation="2"/></filter></defs><circle cx="40" cy="0" r="18" fill="white" filter="url(%23blur)"/></svg>`;
  return {
    name: "circle-blur-top-right",
    css: `
			::view-transition-group(root) {
				animation-timing-function: var(--expo-out);
			}

			::view-transition-new(root) {
				mask: url('${svg}') top right / 0 no-repeat;
				mask-origin: content-box;
				animation: scale 1s;
				animation-fill-mode: both;
				transform-origin: top right;
			}

			::view-transition-old(root),
				.dark::view-transition-old(root) {
				animation: scale 1s;
				animation-fill-mode: both;
				transform-origin: top right;
				z-index: -1;
			}

			@keyframes scale {
				to {
					mask-size: 350vmax;
				}
			}
		`,
  };
};

export const useThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);

  const styleId = "theme-transition-styles";
  const updateStyles = useCallback((css: string) => {
    if (typeof window === "undefined") return;

    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = css;
  }, []);

  const toggleTheme = useCallback(async () => {
    const animation = createAnimation();
    updateStyles(animation.css);

    if (typeof window === "undefined") return;
    if (!document.startViewTransition) {
      setTheme(theme === "light" ? "dark" : "light");
      return;
    }

    const newTheme = theme === "light" ? "dark" : "light";
    await document.startViewTransition(() => {
      flushSync(() => {
        document.documentElement.classList.toggle("dark", newTheme === "dark");
      });
    }).ready;

    // Call setTheme after transition completes
    setTheme(newTheme);
  }, [theme, setTheme, updateStyles]);

  const setLightTheme = useCallback(async () => {
    const animation = createAnimation();
    updateStyles(animation.css);

    if (typeof window === "undefined") return;
    if (!document.startViewTransition) {
      setTheme("light");
      return;
    }

    await document.startViewTransition(() => {
      flushSync(() => {
        document.documentElement.classList.remove("dark");
      });
    }).ready;

    setTheme("light");
  }, [setTheme, updateStyles]);

  const setDarkTheme = useCallback(async () => {
    const animation = createAnimation();
    updateStyles(animation.css);

    if (typeof window === "undefined") return;
    if (!document.startViewTransition) {
      setTheme("dark");
      return;
    }

    await document.startViewTransition(() => {
      flushSync(() => {
        document.documentElement.classList.add("dark");
      });
    }).ready;

    setTheme("dark");
  }, [setTheme, updateStyles]);

  const setSystemTheme = useCallback(async () => {
    const animation = createAnimation();
    updateStyles(animation.css);

    if (typeof window === "undefined") return;
    if (!document.startViewTransition) {
      setTheme("system");
      return;
    }

    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    await document.startViewTransition(() => {
      flushSync(() => {
        document.documentElement.classList.toggle("dark", prefersDark);
      });
    }).ready;

    setTheme("system");
  }, [setTheme, updateStyles]);

  return {
    isDark,
    setIsDark,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    setSystemTheme,
  };
};
