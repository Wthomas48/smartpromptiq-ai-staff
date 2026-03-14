import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import AvatarGenerator, {
  type AvatarStyle,
  type AvatarColorTheme,
} from "./AvatarGenerator";

// ─── Constants ──────────────────────────────────────────────────────────────

const STYLES: { value: AvatarStyle; label: string }[] = [
  { value: "modern", label: "Modern" },
  { value: "illustrated", label: "Illustrated" },
  { value: "minimal", label: "Minimal" },
  { value: "geometric", label: "Geometric" },
  { value: "cosmic", label: "Cosmic" },
];

const COLORS: { value: AvatarColorTheme; hex: string }[] = [
  { value: "purple", hex: "#8B5CF6" },
  { value: "blue", hex: "#3B82F6" },
  { value: "green", hex: "#10B981" },
  { value: "orange", hex: "#F59E0B" },
  { value: "pink", hex: "#EC4899" },
  { value: "cyan", hex: "#06B6D4" },
];

// ─── Props ──────────────────────────────────────────────────────────────────

interface AvatarPreviewProps {
  name: string;
  role: string;
  defaultStyle?: AvatarStyle;
  defaultColorTheme?: AvatarColorTheme;
  onChange?: (config: { style: AvatarStyle; colorTheme: AvatarColorTheme }) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AvatarPreview({
  name,
  role,
  defaultStyle = "modern",
  defaultColorTheme = "purple",
  onChange,
}: AvatarPreviewProps) {
  const [style, setStyle] = useState<AvatarStyle>(defaultStyle);
  const [colorTheme, setColorTheme] = useState<AvatarColorTheme>(defaultColorTheme);

  const handleStyleChange = useCallback(
    (s: AvatarStyle) => {
      setStyle(s);
      onChange?.({ style: s, colorTheme });
    },
    [colorTheme, onChange],
  );

  const handleColorChange = useCallback(
    (c: AvatarColorTheme) => {
      setColorTheme(c);
      onChange?.({ style, colorTheme: c });
    },
    [style, onChange],
  );

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Large preview */}
      <div className="transition-all duration-500 ease-out">
        <AvatarGenerator
          name={name}
          role={role}
          style={style}
          colorTheme={colorTheme}
          size={200}
        />
      </div>

      {/* Style selector */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Style
        </span>
        <div className="flex gap-2">
          {STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => handleStyleChange(s.value)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200",
                style === s.value
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color selector */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Color
        </span>
        <div className="flex gap-3">
          {COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => handleColorChange(c.value)}
              className={cn(
                "h-8 w-8 rounded-full border-2 transition-all duration-200",
                colorTheme === c.value
                  ? "scale-110 border-white shadow-lg ring-2 ring-offset-2 ring-offset-background"
                  : "border-transparent hover:scale-105",
              )}
              style={{
                backgroundColor: c.hex,
                ...(colorTheme === c.value ? { ringColor: c.hex } : {}),
              }}
              title={c.value}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
