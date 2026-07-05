"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "malsight-color-scheme";

const themes = [
  {
    id: "default",
    label: "Default",
    colors: ["#13231d", "#243b32", "#8da99b", "#d6c89b", "#e6e4de"],
  },
  {
    id: "cappuccino",
    label: "Cappuccino",
    colors: ["#4b3832", "#854442", "#fff4e6", "#3c2f2f", "#be9b7b"],
  },
  {
    id: "sage-green",
    label: "Sage Green",
    colors: ["#8f9779", "#78866b", "#738276", "#738678", "#4d5d53"],
  },
  {
    id: "blue-grey",
    label: "Blue-Grey",
    colors: ["#6e7f80", "#536872", "#708090", "#536878", "#36454f"],
  },
  {
    id: "loznice",
    label: "Loznice",
    colors: ["#a69eb0", "#efeff2", "#f2e2cd", "#dadae3", "#000000"],
  },
  {
    id: "soft-black",
    label: "Soft Black",
    colors: ["#0d0d0d", "#171717", "#262626", "#9ca3af", "#f4f4f5"],
  },
  {
    id: "happy-pastel",
    label: "Happy Pastel",
    colors: ["#245a73", "#2f6f87", "#8fcff0", "#a8e6ba", "#ffc48f"],
  },
  {
    id: "grey-lavender",
    label: "Grey-Lavender",
    colors: ["#f2f0f7", "#ded8ec", "#c6bfd8", "#8f88a8", "#47415a"],
  },
];

export default function ThemeSwitcher() {
  const [activeTheme, setActiveTheme] = useState("default");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY) ?? "default";
    setTheme(savedTheme);
  }, []);

  function setTheme(themeId: string) {
    const nextTheme = themes.some((theme) => theme.id === themeId)
      ? themeId
      : "default";

    setActiveTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  }

  return (
    <details className="theme-switcher">
      <summary aria-label="Choose color scheme" title="Choose color scheme">
        <span className="theme-switcher-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </summary>

      <div className="theme-switcher-menu">
        {themes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className={activeTheme === theme.id ? "is-active" : ""}
            onClick={() => setTheme(theme.id)}
          >
            <span className="theme-switcher-swatches" aria-hidden="true">
              {theme.colors.map((color) => (
                <span key={color} style={{ backgroundColor: color }} />
              ))}
            </span>
            <span>{theme.label}</span>
          </button>
        ))}
      </div>
    </details>
  );
}
