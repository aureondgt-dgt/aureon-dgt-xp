import { Icon, type IconName } from "./icons";

const TIER_ACCENTS: Record<number, string> = {
  1: "#9ca3af",
  2: "#93c5fd",
  3: "#7dd3fc",
  4: "#a259ff",
  5: "#c084fc",
  6: "#f0abfc",
  7: "#fbbf24",
  8: "#fb7185",
  9: "#34d399",
  10: "#fef3c7",
};

export function RankEmblem({
  tier,
  color,
  size = 96,
  muted = false,
  className = "",
}: {
  tier: number;
  color?: string;
  size?: number;
  muted?: boolean;
  className?: string;
}) {
  const accent = muted ? "#4b4b5c" : color ?? TIER_ACCENTS[tier] ?? "#a259ff";
  const stars = Math.max(1, Math.min(5, Math.ceil(tier / 2)));

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ filter: muted ? "none" : `drop-shadow(0 0 12px ${accent}55)` }}
    >
      <defs>
        <linearGradient id={`emblem-fill-${tier}-${muted ? "m" : "a"}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.42" />
          <stop offset="60%" stopColor="#0b0b13" stopOpacity="0.95" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.28" />
        </linearGradient>
      </defs>
      {/* laurels */}
      <path
        d="M20 50c-4-10 0-22 8-28M80 50c4-10 0-22-8-28"
        fill="none"
        stroke={accent}
        strokeOpacity="0.45"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M18 56c-2-9 1-18 6-24M82 56c2-9-1-18-6-24"
        fill="none"
        stroke={accent}
        strokeOpacity="0.25"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* shield */}
      <path
        d="M50 8 82 20v26c0 20-14 34-32 44C32 80 18 66 18 46V20L50 8Z"
        fill={`url(#emblem-fill-${tier}-${muted ? "m" : "a"})`}
        stroke={accent}
        strokeWidth="2"
        strokeOpacity="0.85"
      />
      <path
        d="M50 15 75.5 24v22c0 16-11.5 28-25.5 36.4C36 74 25.5 62 25.5 46V24L50 15Z"
        fill="none"
        stroke={accent}
        strokeOpacity="0.32"
        strokeWidth="1.2"
      />
      {/* central star */}
      <path
        d="m50 34 4.6 9.6 10.4 1.5-7.6 7.4 1.9 10.3L50 57.9l-9.3 4.9 1.9-10.3-7.6-7.4 10.4-1.5L50 34Z"
        fill={accent}
        fillOpacity={muted ? 0.35 : 0.95}
        stroke={accent}
        strokeWidth="0.8"
      />
      <g fill={accent} fillOpacity={muted ? 0.4 : 1}>
        {Array.from({ length: stars }).map((_, index) => {
          const total = stars;
          const spread = 30;
          const start = 50 - spread / 2;
          const x = total === 1 ? 50 : start + (spread / (total - 1)) * index;
          return <circle key={index} cx={x} cy={72} r="1.9" />;
        })}
      </g>
    </svg>
  );
}

const RARITY_STYLES: Record<string, { ring: string; fill: string; icon: string }> = {
  comum: { ring: "#9ca3af", fill: "#0f0f17", icon: "#d1d5db" },
  rara: { ring: "#7dd3fc", fill: "#0d1117", icon: "#bae6fd" },
  epica: { ring: "#c084fc", fill: "#120d1c", icon: "#e9d5ff" },
  lendaria: { ring: "#fbbf24", fill: "#1a1408", icon: "#fde68a" },
};

export function AchievementBadge({
  icon,
  rarity = "comum",
  unlocked = true,
  size = 64,
  className = "",
}: {
  icon: string;
  rarity?: string;
  unlocked?: boolean;
  size?: number;
  className?: string;
}) {
  const style = RARITY_STYLES[rarity] ?? RARITY_STYLES.comum;
  const ring = unlocked ? style.ring : "#3f3f4d";
  const fill = unlocked ? style.fill : "#0a0a11";
  const iconColor = unlocked ? style.icon : "#5b5b6b";

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        filter: unlocked ? `drop-shadow(0 0 10px ${ring}66)` : "grayscale(1)",
        opacity: unlocked ? 1 : 0.55,
      }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`ach-${icon}-${rarity}-${unlocked ? "u" : "l"}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={ring} stopOpacity="0.95" />
            <stop offset="100%" stopColor={ring} stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <path
          d="M50 3 88 25v50L50 97 12 75V25L50 3Z"
          fill={fill}
          stroke={`url(#ach-${icon}-${rarity}-${unlocked ? "u" : "l"})`}
          strokeWidth="3"
        />
        <path d="M50 10 82 29v42L50 90 18 71V29L50 10Z" fill="none" stroke={ring} strokeOpacity="0.22" strokeWidth="1.2" />
      </svg>
      <Icon name={(icon as IconName) ?? "trophy"} size={size * 0.44} style={{ color: iconColor }} />
    </div>
  );
}
