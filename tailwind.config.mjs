/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0d12",
        panel: "#11141b",
        panel2: "#161a23",
        border: "#222735",
        muted: "#8a93a6",
        text: "#e6e9f0",
        accent: "#5b8cff",
        good: "#3fb27f",
        warn: "#e0a23a",
        bad: "#e0574a",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
