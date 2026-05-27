// app/api/random-sample/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".flac", ".m4a"];

export async function GET(req: NextRequest) {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase server environment variables" },
        { status: 500 }
      );
    }

    const battleId = req.nextUrl.searchParams.get("battleId");

    if (!battleId) {
      return NextResponse.json(
        { error: "Missing battleId" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1) Check whether this lobby already has a saved sample.
    const { data: existingLobby, error: existingLobbyError } = await supabase
      .from("battle_lobbies")
      .select("id, sample_name, sample_url")
      .eq("id", battleId)
      .single();

    if (existingLobbyError || !existingLobby) {
      return NextResponse.json(
        {
          error:
            existingLobbyError?.message ||
            "Could not find battle lobby for sample",
        },
        { status: 500 }
      );
    }

    if (existingLobby.sample_name && existingLobby.sample_url) {
      return NextResponse.json({
        filename: existingLobby.sample_name,
        url: existingLobby.sample_url,
      });
    }

    // 2) No sample saved yet, so choose one random sample.
    const { data: files, error: listError } = await supabase.storage
      .from("battle-samples")
      .list("", {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });

    if (listError) {
      return NextResponse.json(
        { error: `Failed to list samples: ${listError.message}` },
        { status: 500 }
      );
    }

    const audioFiles =
      files?.filter((file) =>
        AUDIO_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
      ) ?? [];

    if (audioFiles.length === 0) {
      return NextResponse.json(
        { error: "No audio samples found in Supabase bucket battle-samples" },
        { status: 500 }
      );
    }

    const randomIndex = Math.floor(Math.random() * audioFiles.length);
    const filename = audioFiles[randomIndex].name;

    const { data: publicUrlData } = supabase.storage
      .from("battle-samples")
      .getPublicUrl(filename);

    const sampleUrl = publicUrlData.publicUrl;

    // 3) Save the sample only if another request has not already saved one.
    const { data: updatedLobby, error: updateError } = await supabase
      .from("battle_lobbies")
      .update({
        sample_name: filename,
        sample_url: sampleUrl,
      })
      .eq("id", battleId)
      .is("sample_name", null)
      .select("sample_name, sample_url")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to save sample: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 4) If this request saved the sample, return it.
    if (updatedLobby?.sample_name && updatedLobby?.sample_url) {
      return NextResponse.json({
        filename: updatedLobby.sample_name,
        url: updatedLobby.sample_url,
      });
    }

    // 5) If another user saved the sample at the same time, read the final saved sample.
    const { data: finalLobby, error: finalError } = await supabase
      .from("battle_lobbies")
      .select("sample_name, sample_url")
      .eq("id", battleId)
      .single();

    if (finalError || !finalLobby?.sample_name || !finalLobby?.sample_url) {
      return NextResponse.json(
        {
          error:
            finalError?.message ||
            "Sample was not saved correctly. Please refresh.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      filename: finalLobby.sample_name,
      url: finalLobby.sample_url,
    });
  } catch (err: any) {
    console.error("Error loading random sample:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load random sample" },
      { status: 500 }
    );
  }
}