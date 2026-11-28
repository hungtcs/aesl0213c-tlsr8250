export const THEME = {
  // E-Ink BWR Palette (Black, White, Red) + Geek Accent
  paper: "#F5F2EB",
  paperCard: "#FFFFFF",
  paperBorder: "#DCD6C8",
  ink: "#141416",
  inkSoft: "#2E3036",
  inkMuted: "#646872",
  darkBg: "#111317",
  darkCard: "#1B1E26",
  darkBorder: "#2E3340",
  red: "#D92B2B",
  redSoft: "#FEE2E2",
  redGlow: "rgba(217, 43, 43, 0.28)",
  green: "#22C55E",
  greenSoft: "rgba(34, 197, 94, 0.16)",
  blue: "#3B82F6",
  amber: "#F59E0B",
  fontSans:
    '"Source Han Sans SC VF", "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif',
  fontMono:
    '"Noto Sans Mono CJK SC", "JetBrains Mono", "Fira Code", ui-monospace, monospace',
} as const;

export const SPRING_SNAPPY = {
  damping: 18,
  stiffness: 170,
  mass: 0.8,
};

export const SPRING_SMOOTH = {
  damping: 22,
  stiffness: 110,
  mass: 0.9,
};
