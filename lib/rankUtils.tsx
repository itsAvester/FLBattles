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

  if (rating >= 1500) return "Champion";
  if (rating >= 1000) return "Emerald";
  if (rating >= 800) return "Diamond";
  if (rating >= 600) return "Platinum";
  if (rating >= 400) return "Gold";
  if (rating >= 200) return "Silver";
  // 0–199
  return "Bronze";
}
