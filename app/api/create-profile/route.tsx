// app/api/create-profile/route.tsx

import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

const CURRENT_TERMS_VERSION = "terms-v1";
const CURRENT_PRIVACY_VERSION = "privacy-v1";
const CURRENT_COPYRIGHT_POLICY_VERSION = "copyright-policy-v1";
const CURRENT_BATTLE_RULES_VERSION = "battle-rules-v1";

export async function POST(req: Request) {
  try {
    const { userId, email, legalAcceptance } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId in request body" },
        { status: 400 }
      );
    }

    if (!legalAcceptance?.accepted || !legalAcceptance?.ageConfirmed) {
      return NextResponse.json(
        {
          error:
            "You must confirm your age and accept the site terms before creating an account.",
        },
        { status: 400 }
      );
    }

    const acceptedAt =
      typeof legalAcceptance.acceptedAt === "string"
        ? legalAcceptance.acceptedAt
        : new Date().toISOString();

    // Upsert profile using SERVICE ROLE KEY (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          display_name: email ? email.split("@")[0] : "New User",
          total_battles: 0,
          win_rate: 0,
          rating: 0,

          // Account-level legal acceptance record
          age_confirmed: true,
          age_confirmed_at: acceptedAt,
          terms_accepted_at: acceptedAt,
          terms_version:
            legalAcceptance.termsVersion || CURRENT_TERMS_VERSION,
          privacy_version:
            legalAcceptance.privacyVersion || CURRENT_PRIVACY_VERSION,
          copyright_policy_version:
            legalAcceptance.copyrightPolicyVersion ||
            CURRENT_COPYRIGHT_POLICY_VERSION,
          battle_rules_version:
            legalAcceptance.battleRulesVersion ||
            CURRENT_BATTLE_RULES_VERSION,
          legal_acceptance_text:
            legalAcceptance.acceptanceText ||
            "User confirmed age eligibility and accepted FLBattles terms, privacy policy, copyright policy, and battle rules.",
        },
        {
          onConflict: "id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("create-profile upsert error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to upsert profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: data }, { status: 200 });
  } catch (err: any) {
    console.error("create-profile unexpected error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
