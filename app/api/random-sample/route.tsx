// app/api/random-sample/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export async function GET() {
  try {
    // absolute path to /public/samples
    const samplesDir = path.join(process.cwd(), "public", "samples");

    const files = await fs.readdir(samplesDir);

    // Only allow common audio extensions
    const audioFiles = files.filter((file) =>
      file.match(/\.(mp3|wav|ogg|flac)$/i)
    );

    if (audioFiles.length === 0) {
      return NextResponse.json(
        { error: "No audio samples found in /public/samples" },
        { status: 500 }
      );
    }

    const randomIndex = Math.floor(Math.random() * audioFiles.length);
    const filename = audioFiles[randomIndex];
    const url = `/samples/${filename}`;

    return NextResponse.json({ filename, url });
  } catch (err) {
    console.error("Error reading samples directory:", err);
    return NextResponse.json(
      { error: "Failed to read samples directory" },
      { status: 500 }
    );
  }
}
