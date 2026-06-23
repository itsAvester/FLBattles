import type { CSSProperties } from "react";

export type BadgeTone =
  | "champion"
  | "goat"
  | "perfect"
  | "fire"
  | "veteran"
  | "regular"
  | "rising"
  | "default";

export type BadgeMeta = {
  key: string;
  name: string;
  label: string;
  description: string;
  unlockText: string;
  imageSrc: string | null;
  tone: BadgeTone;
};

export const BADGE_LIST: BadgeMeta[] = [
  {
    key: "champion",
    name: "Champion",
    label: "Champion",
    description: "Reached the #1 spot on the ranked leaderboard.",
    unlockText: "Reach #1 on the leaderboard.",
    imageSrc: "/badges/champion.png",
    tone: "champion",
  },
  {
    key: "top_10",
    name: "Top 10",
    label: "Top 10",
    description: "Reached the top 10 on the ranked leaderboard.",
    unlockText: "Reach the top 10 on the leaderboard.",
    imageSrc: "/badges/top_10.png",
    tone: "goat",
  },
  {
    key: "perfect_record",
    name: "Perfect Record",
    label: "Perfect Record",
    description: "Held a 100% win rate with 3+ battles.",
    unlockText: "Hold a 100% win rate with 3+ battles.",
    imageSrc: "/badges/perfect_record.png",
    tone: "perfect",
  },
  {
    key: "hot_streak",
    name: "Hot Streak",
    label: "Hot Streak",
    description: "Won 3 battles in a row.",
    unlockText: "Coming soon: win 3 battles in a row.",
    imageSrc: "/badges/hot_streak.png",
    tone: "fire",
  },
  {
    key: "veteran",
    name: "Veteran",
    label: "Veteran",
    description: "Played 10 ranked battles.",
    unlockText: "Play 10 ranked battles.",
    imageSrc: "/badges/veteran.png",
    tone: "veteran",
  },
  {
    key: "ranked_regular",
    name: "Ranked Regular",
    label: "Ranked Regular",
    description: "Played 5 ranked battles.",
    unlockText: "Play 5 ranked battles.",
    imageSrc: "/badges/ranked_regular.png",
    tone: "regular",
  },
  {
    key: "rising_producer",
    name: "Rising Producer",
    label: "Rising Producer",
    description: "Reached 50 rating.",
    unlockText: "Reach 50 rating.",
    imageSrc: "/badges/rising_producer.png",
    tone: "rising",
  },
  {
    key: "first_win",
    name: "First Win",
    label: "First Win",
    description: "Won your first ranked battle.",
    unlockText: "Win your first battle.",
    imageSrc: "/badges/first_win.png",
    tone: "champion",
  },
];

export const BADGE_CATALOG: Record<string, BadgeMeta> = BADGE_LIST.reduce(
  (catalog, badge) => {
    catalog[badge.key] = badge;
    return catalog;
  },
  {} as Record<string, BadgeMeta>
);

const DEFAULT_BADGE: BadgeMeta = {
  key: "default",
  name: "Producer",
  label: "Producer",
  description: "Default producer badge.",
  unlockText: "Default badge.",
  imageSrc: null,
  tone: "default",
};

export function getBadgeByKey(key: string | null | undefined): BadgeMeta | null {
  if (!key) return null;
  return BADGE_CATALOG[key] ?? null;
}

export function getBadgeMeta(key: string | null | undefined): BadgeMeta {
  return getBadgeByKey(key) ?? DEFAULT_BADGE;
}

function getBadgeFrameStyle(
  tone: BadgeTone,
  options?: {
    selected?: boolean;
    locked?: boolean;
  }
): CSSProperties {
  const selected = options?.selected ?? false;
  const locked = options?.locked ?? false;

  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    border: selected
      ? "1px solid rgba(140,255,107,0.5)"
      : "1px solid rgba(255,255,255,0.12)",
    background: selected
      ? "rgba(140,255,107,0.08)"
      : "rgba(255,255,255,0.045)",
    boxShadow: selected
      ? "0 0 0 3px rgba(140,255,107,0.12), inset 0 0 0 1px rgba(255,255,255,0.035)"
      : "inset 0 0 0 1px rgba(255,255,255,0.025)",
    overflow: "hidden",
    flexShrink: 0,
    opacity: locked ? 0.42 : 1,
    filter: locked ? "grayscale(1)" : "none",
  };

  if (locked) return base;

  switch (tone) {
    case "champion":
      return {
        ...base,
        border: selected
          ? "1px solid rgba(140,255,107,0.5)"
          : "1px solid rgba(246,198,91,0.42)",
        background:
          "radial-gradient(circle at 30% 20%, rgba(246,198,91,0.16), rgba(255,77,28,0.055))",
      };

    case "goat":
      return {
        ...base,
        border: selected
          ? "1px solid rgba(140,255,107,0.5)"
          : "1px solid rgba(255,116,67,0.34)",
        background: "rgba(255,77,28,0.06)",
      };

    case "perfect":
      return {
        ...base,
        border: selected
          ? "1px solid rgba(140,255,107,0.5)"
          : "1px solid rgba(186,230,253,0.35)",
        background: "rgba(14,165,233,0.07)",
      };

    case "fire":
      return {
        ...base,
        border: selected
          ? "1px solid rgba(140,255,107,0.5)"
          : "1px solid rgba(255,77,28,0.38)",
        background: "rgba(255,77,28,0.075)",
      };

    case "veteran":
      return {
        ...base,
        border: selected
          ? "1px solid rgba(140,255,107,0.5)"
          : "1px solid rgba(209,213,219,0.24)",
        background: "rgba(209,213,219,0.055)",
      };

    case "regular":
      return {
        ...base,
        border: selected
          ? "1px solid rgba(140,255,107,0.5)"
          : "1px solid rgba(246,198,91,0.28)",
        background: "rgba(246,198,91,0.055)",
      };

    case "rising":
      return {
        ...base,
        border: selected
          ? "1px solid rgba(140,255,107,0.5)"
          : "1px solid rgba(140,255,107,0.28)",
        background: "rgba(140,255,107,0.055)",
      };

    default:
      return base;
  }
}

function DefaultBadgeIcon({ size }: { size: number }) {
  return (
    <span
      style={{
        width: Math.round(size * 0.72),
        height: Math.round(size * 0.72),
        display: "grid",
        gap: Math.max(2, Math.round(size * 0.055)),
        alignContent: "center",
        justifyItems: "center",
      }}
      aria-hidden="true"
    >
      <span
        style={{
          width: "70%",
          height: Math.max(3, Math.round(size * 0.09)),
          background: "var(--orange)",
          boxShadow: "6px 0 0 rgba(255,77,28,0.55)",
        }}
      />
      <span
        style={{
          width: "52%",
          height: Math.max(3, Math.round(size * 0.09)),
          background: "rgba(255,255,255,0.72)",
        }}
      />
      <span
        style={{
          width: "34%",
          height: Math.max(3, Math.round(size * 0.09)),
          background: "rgba(140,255,107,0.7)",
        }}
      />
    </span>
  );
}

export function BadgeIcon({
  badgeKey,
  size = 34,
  selected = false,
  locked = false,
  title,
}: {
  badgeKey?: string | null;
  size?: number;
  selected?: boolean;
  locked?: boolean;
  title?: string;
}) {
  const badge = getBadgeMeta(badgeKey);

  return (
    <span
      title={title ?? badge.label}
      aria-label={badge.label}
      style={{
        ...getBadgeFrameStyle(badge.tone, { selected, locked }),
        width: size,
        height: size,
        minWidth: size,
      }}
    >
      {badge.imageSrc ? (
        <img
          src={badge.imageSrc}
          alt=""
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "contain",
            padding: Math.max(2, Math.round(size * 0.04)),
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      ) : (
        <DefaultBadgeIcon size={size} />
      )}
    </span>
  );
}
