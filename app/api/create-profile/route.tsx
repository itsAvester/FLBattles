// app/api/create-profile/route.tsx

import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin"; // <-- new admin client

export async function POST(req: Request) {
  try {
    const { userId, email } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId in request body" },
        { status: 400 }
      );
    }

    // Upsert profile using SERVICE ROLE KEY (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          display_name: email ? email.split("@")[0] : "New User",
          total_battles: 0,
          win_rate: 0,
          rating: 0, // or your starting rating
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
