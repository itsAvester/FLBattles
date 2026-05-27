// lib/rankUtils.ts
export type RankTier =
  | "Unranked"
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond"
  | "Emerald"
  | "Champion"
  | "Top 10";

export function computeRankTier(
  rating: number | null,
  globalRank?: number | null
): RankTier {
  if (rating == null) return "Unranked";

  // Special case: top 10 on site
  if (globalRank != null && globalRank > 0 && globalRank <= 10) {
    return "Top 10";
  }

  if (rating >= 599) return "Champion";
  if (rating >= 399) return "Emerald";
  if (rating >= 299) return "Diamond";
  if (rating >= 199) return "Platinum";
  if (rating >= 99) return "Gold";
  if (rating >= 49) return "Silver";
  // 0–199
  return "Bronze";
}
