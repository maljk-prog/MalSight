import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#07111f",
        panel: "#0d1b2e",
        panelSoft: "#12253d",
        accent: "#5eead4",
      },
    },
  },
  plugins: [],
};

export default config;
