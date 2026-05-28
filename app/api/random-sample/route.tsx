// app/api/random-sample/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET_NAME = "battle-samples";

const AUDIO_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".m4a",
  ".aif",
  ".aiff",
  ".webm",
];

type SampleFile = {
  name: string;
  path: string;
};

function isAudioFile(path: string) {
  const lower = path.toLowerCase();
  return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function isProbablyFolder(file: any) {
  // Supabase Storage folder entries usually have no id / no metadata.
  return !file.id || file.metadata === null;
}

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
    // This keeps every player in the same battle on the same sample.
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

    // 2) Recursively list all audio samples in the bucket.
    const allAudioFiles: SampleFile[] = [];

    async function listFolder(prefix: string) {
      const limit = 1000;
      let offset = 0;

      while (true) {
        const { data: files, error: listError } = await supabase.storage
          .from(BUCKET_NAME)
          .list(prefix, {
            limit,
            offset,
            sortBy: { column: "name", order: "asc" },
          });

        if (listError) {
          throw new Error(`Failed to list samples: ${listError.message}`);
        }

        if (!files || files.length === 0) break;

        for (const file of files) {
          const fullPath = prefix ? `${prefix}/${file.name}` : file.name;

          if (isAudioFile(fullPath)) {
            allAudioFiles.push({
              name: file.name,
              path: fullPath,
            });
          } else if (isProbablyFolder(file)) {
            await listFolder(fullPath);
          }
        }

        if (files.length < limit) break;
        offset += limit;
      }
    }

    await listFolder("");

    if (allAudioFiles.length === 0) {
      return NextResponse.json(
        { error: `No audio samples found in Supabase bucket ${BUCKET_NAME}` },
        { status: 500 }
      );
    }

    // 3) Choose one random sample from every discovered audio file.
    const randomIndex = Math.floor(Math.random() * allAudioFiles.length);
    const selectedSample = allAudioFiles[randomIndex];

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(selectedSample.path);

    const sampleUrl = publicUrlData.publicUrl;

    // 4) Save the sample only if another request has not already saved one.
    const { data: updatedLobby, error: updateError } = await supabase
      .from("battle_lobbies")
      .update({
        sample_name: selectedSample.path,
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

    // 5) If this request saved the sample, return it.
    if (updatedLobby?.sample_name && updatedLobby?.sample_url) {
      return NextResponse.json({
        filename: updatedLobby.sample_name,
        url: updatedLobby.sample_url,
      });
    }

    // 6) If another user saved the sample at the same time, return the final saved sample.
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