// app/api/random-sample/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".flac", ".m4a"];

export async function GET() {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase server environment variables" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: files, error } = await supabase.storage
      .from("battle-samples")
      .list("", {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      return NextResponse.json(
        { error: `Failed to list samples: ${error.message}` },
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

    return NextResponse.json({
      filename,
      url: publicUrlData.publicUrl,
    });
  } catch (err: any) {
    console.error("Error loading random sample:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load random sample" },
      { status: 500 }
    );
  }
}