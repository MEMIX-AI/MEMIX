import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        line: "var(--line)",
        text: "var(--text)",
        dim: "var(--dim)",
        accent: "var(--accent)",
        ok: "var(--ok)",
      },
      fontFamily: {
        mono: ["ui-monospace", "SF Mono", "Menlo", "Consolas", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
    },
  },
  plugins: [],
};
export default config;
